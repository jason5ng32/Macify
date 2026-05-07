#!/bin/bash
# Macify local Aerial server — one-shot installer (Apache-based).
#
# Configures macOS's preinstalled Apache to serve the Aerial videos
# directory at http://*:18000/videos/ for the Macify Chrome extension.
#
# Requires: macOS, /usr/sbin/apachectl (preinstalled), sudo (for writing
#   the Apache drop-in symlink and restarting Apache).
# Does NOT require: Homebrew, Python, or any extra installs.
#
# Run via:
#   bash <(curl -fsSL https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/local-server/setup.sh)
#
# Override the source (for development/testing) with:
#   MACIFY_SOURCE=file:///path/to/scripts/local-server bash setup.sh
# Skip the interactive replace prompt with:
#   MACIFY_YES=1 bash setup.sh

set -euo pipefail

# --- Constants ----------------------------------------------------------------

PORT=18000
USER_DIR="$HOME/.macify"
USER_CONF="$USER_DIR/videoserver.conf"
APACHE_CTL="/usr/sbin/apachectl"
APACHE_DROPIN_DIR="/private/etc/apache2/other"
APACHE_DROPIN="$APACHE_DROPIN_DIR/macify.conf"
APACHE_PLIST="/System/Library/LaunchDaemons/org.apache.httpd.plist"
VIDEOS_DIR="$HOME/Library/Application Support/com.apple.wallpaper/aerials/videos"
SOURCE_BASE="${MACIFY_SOURCE:-https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/local-server}"

# --- Output helpers -----------------------------------------------------------

if [ -t 1 ]; then TTY=1; else TTY=0; fi
c_red()    { [ "$TTY" = "1" ] && printf '\033[31m%s\033[0m' "$*" || printf '%s' "$*"; }
c_green()  { [ "$TTY" = "1" ] && printf '\033[32m%s\033[0m' "$*" || printf '%s' "$*"; }
c_yellow() { [ "$TTY" = "1" ] && printf '\033[33m%s\033[0m' "$*" || printf '%s' "$*"; }
c_cyan()   { [ "$TTY" = "1" ] && printf '\033[36m%s\033[0m' "$*" || printf '%s' "$*"; }
c_dim()    { [ "$TTY" = "1" ] && printf '\033[2m%s\033[0m' "$*" || printf '%s' "$*"; }

info()    { printf '%s %s\n' "$(c_cyan 'ℹ')" "$*"; }
ok()      { printf '%s %s\n' "$(c_green '✓')" "$*"; }
warn()    { printf '%s %s\n' "$(c_yellow '⚠')" "$*" >&2; }
fail()    { printf '%s %s\n' "$(c_red '✗')" "$*" >&2; exit 1; }
heading() { printf '\n%s\n' "$(c_cyan "→ $*")"; }

# --- Pre-flight checks --------------------------------------------------------

heading "Pre-flight checks"

if [ "$(uname -s)" != "Darwin" ]; then
    fail "macOS only."
fi
ok "macOS detected"

if [ ! -x "$APACHE_CTL" ]; then
    fail "$APACHE_CTL not found. macOS's built-in Apache is required."
fi
ok "Apache at $APACHE_CTL"

if [ -z "${USER:-}" ]; then
    USER="$(whoami)"
fi
ok "user $USER"

if [ ! -d "$VIDEOS_DIR" ]; then
    warn "Aerial videos directory not found yet:
  $VIDEOS_DIR
Open System Settings -> Screen Saver -> Aerial once to create it.
Continuing anyway — Apache will start serving as soon as the directory exists."
else
    VIDEO_COUNT=$(find "$VIDEOS_DIR" -maxdepth 1 -name '*.mov' 2>/dev/null | wc -l | tr -d ' ')
    ok "videos directory found ($VIDEO_COUNT .mov files)"
fi

# --- Conflict detection -------------------------------------------------------

heading "Conflict detection"

# Find aerial-related drop-in confs that aren't ours. Real users have named
# these things differently than the README example (videoserver.conf,
# localvideoserver.conf, etc.) — grep content to catch them.
LEGACY_CONFS=()
if [ -d "$APACHE_DROPIN_DIR" ]; then
    while IFS= read -r conf; do
        # Skip our own — we'll overwrite the symlink later.
        [ "$(basename "$conf")" = "macify.conf" ] && continue

        if grep -qE '(:18000|aerials/videos|wallpaper/aerials|videoserver)' "$conf" 2>/dev/null; then
            LEGACY_CONFS+=("$conf")
        elif [ -L "$conf" ] && [ ! -e "$conf" ]; then
            case "$(basename "$conf")" in
                *video*|*aerial*|*macify*) LEGACY_CONFS+=("$conf") ;;
            esac
        fi
    done < <(find "$APACHE_DROPIN_DIR" -maxdepth 1 \( -name '*.conf' -o -name '*.conf.disabled' \) 2>/dev/null)
fi

# Two separate questions:
#   1. Is anything OTHER than httpd holding port 18000? (hard stop)
#   2. Is httpd running anywhere? (decides whether we restart vs start fresh
#      — and a previous version of this script confused the two by deriving
#      "is httpd running?" from "does port 18000 have httpd?". When the
#      first install bound only :80, the second run saw nothing on :18000
#      and called `apachectl start`, which silently no-ops on an already-
#      running httpd, so the new config never got loaded.)
PORT_HOLDER_RAW="$(lsof -nP -iTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
PORT_HOLDER_CMDS="$(printf '%s\n' "$PORT_HOLDER_RAW" | tail -n +2 | awk '{print $1}' | sort -u)"

NON_HTTPD_PORT_HOLDER=0
if [ -n "$PORT_HOLDER_CMDS" ]; then
    while IFS= read -r cmd; do
        [ -z "$cmd" ] && continue
        if [ "$cmd" != "httpd" ]; then
            NON_HTTPD_PORT_HOLDER=1
            break
        fi
    done <<< "$PORT_HOLDER_CMDS"
fi

if [ "$NON_HTTPD_PORT_HOLDER" = "1" ]; then
    {
        printf '%s Port %s is held by a non-Apache process:\n\n%s\n\nStop it before running setup again.\n' \
            "$(c_red '✗')" "$PORT" "$PORT_HOLDER_RAW"
    } >&2
    exit 1
fi

HTTPD_RUNNING=0
if pgrep -x httpd >/dev/null 2>&1; then
    HTTPD_RUNNING=1
fi

# Ask before we touch anything destructive.
if [ "${#LEGACY_CONFS[@]}" -gt 0 ]; then
    echo
    info "Found existing Aerial-related Apache config(s) that will conflict:"
    for conf in "${LEGACY_CONFS[@]}"; do
        if [ -L "$conf" ]; then
            target="$(readlink "$conf" || true)"
            printf '  %s -> %s\n' "$conf" "${target:-?}"
        else
            printf '  %s\n' "$conf"
        fi
    done

    if [ "${MACIFY_YES:-}" = "1" ]; then
        info "MACIFY_YES=1 — replacing without prompting"
    else
        printf '\n%s ' "$(c_yellow 'Remove these and install Macify config? [y/N]')"
        read -r ANSWER </dev/tty || ANSWER=""
        case "$ANSWER" in
            y|Y|yes|YES) ;;
            *) fail "Aborted. Re-run with MACIFY_YES=1 to skip this prompt." ;;
        esac
    fi
fi

ok "ready to install"

# --- Generate user-dir conf ---------------------------------------------------

heading "Writing config"

mkdir -p "$USER_DIR"

fetch_file() {
    local src="$1"
    local dest="$2"
    if [[ "$src" == file://* ]]; then
        cp "${src#file://}" "$dest"
    else
        curl -fsSL "$src" -o "$dest"
    fi
}

TEMPLATE_TMP="$(mktemp -t macify-conf.XXXXXX)"
trap 'rm -f "$TEMPLATE_TMP"' EXIT
info "fetching config template from $(c_dim "$SOURCE_BASE")"
fetch_file "$SOURCE_BASE/videoserver.conf.template" "$TEMPLATE_TMP"

# sed delimiter '|' — paths contain '/' but not '|'.
sed -e "s|__MACIFY_USER__|$USER|g" \
    -e "s|__MACIFY_VIDEOS_DIR__|$VIDEOS_DIR|g" \
    "$TEMPLATE_TMP" > "$USER_CONF"
chmod 644 "$USER_CONF"
ok "config written: $USER_CONF"

# --- Sudo phase: install symlink, validate, restart ---------------------------

heading "Installing into Apache (requires sudo)"
info "macOS will prompt for your password once."

# Remove legacy confs and our previous symlink (idempotent re-install).
if [ "${#LEGACY_CONFS[@]}" -gt 0 ]; then
    sudo rm -f "${LEGACY_CONFS[@]}"
    for conf in "${LEGACY_CONFS[@]}"; do
        ok "removed legacy $conf"
    done
fi
sudo rm -f "$APACHE_DROPIN"
sudo ln -s "$USER_CONF" "$APACHE_DROPIN"
ok "linked $APACHE_DROPIN -> $USER_CONF"

# Configtest with our config in place. If it fails, roll back so the user
# isn't left with a broken Apache that won't restart.
heading "Validating Apache config"
if ! sudo "$APACHE_CTL" configtest 2>&1; then
    sudo rm -f "$APACHE_DROPIN"
    fail "Apache configtest failed. Symlink rolled back; your existing Apache state is unchanged.
Run \`sudo $APACHE_CTL configtest\` to debug."
fi
ok "config syntax OK"

heading "Starting Apache"
# Use stop + wait + start instead of `apachectl restart`. A graceful
# restart hands the listening socket from old workers to a new master,
# but if any worker is still draining a connection the new master can
# fail to bind a port silently and end up serving on a subset of the
# configured Listen directives. stop + wait makes sure all sockets are
# released before the new master starts.
if [ "$HTTPD_RUNNING" = "1" ]; then
    sudo "$APACHE_CTL" stop || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
        sleep 0.3
        pgrep -x httpd >/dev/null 2>&1 || break
    done
    if pgrep -x httpd >/dev/null 2>&1; then
        warn "httpd still running after stop — proceeding anyway"
    fi
fi
sudo "$APACHE_CTL" start
ok "apachectl start"

# Make sure Apache survives reboot. Idempotent — `load -w` is a no-op if
# already loaded.
sudo launchctl load -w "$APACHE_PLIST" 2>/dev/null || true
ok "Apache enabled at boot"

# --- Verify -------------------------------------------------------------------

heading "Verifying"

# Apache restart can take a few seconds on slower machines to bind the
# port. Retry the probe up to ~5s before giving up.
#
# Subtle: when curl can't connect it both writes "000" to stdout (via
# -w '%{http_code}') AND exits non-zero. If we put `|| echo '000'` INSIDE
# the $(...) the two outputs concatenate to "000000". So we let `|| true`
# swallow the exit code and rely on curl's own "000" output.
HTTP_STATUS=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 0.5
    HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/videos/" 2>/dev/null || true)"
    HTTP_STATUS="${HTTP_STATUS:-000}"
    if [ "$HTTP_STATUS" != "000" ]; then
        break
    fi
done

URL="http://127.0.0.1:$PORT/videos/"
case "$HTTP_STATUS" in
    200|301|302|403)
        ok "local server is up at $URL (HTTP $HTTP_STATUS)"
        echo
        info "In Macify's options page, set the source to '$(c_cyan 'Local server')' with URL: $URL"
        info "Config:     $USER_CONF"
        info "Apache log: /var/log/apache2/error_log (sudo to read)"
        info "Uninstall:  bash <(curl -fsSL ${SOURCE_BASE}/uninstall.sh)"
        ;;
    000)
        {
            printf '%s Apache did not respond on port %s after 5s.\n\n' "$(c_red '✗')" "$PORT"
            printf 'Port %s status:\n' "$PORT"
            lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || printf '  (nothing listening)\n'
            printf '\nLast 20 Apache error log lines:\n'
            sudo tail -n 20 /var/log/apache2/error_log 2>/dev/null || printf '  (could not read /var/log/apache2/error_log)\n'
            printf '\nDebug further:\n'
            printf '  sudo %s configtest\n' "$APACHE_CTL"
            printf '  sudo %s -S\n' "$APACHE_CTL"
        } >&2
        exit 1
        ;;
    *)
        warn "server responded with HTTP $HTTP_STATUS — unexpected."
        warn "Check /var/log/apache2/error_log"
        ;;
esac
