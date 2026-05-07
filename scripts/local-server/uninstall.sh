#!/bin/bash
# Macify local Aerial server — uninstaller (Apache-based).
#
# Removes the Apache drop-in symlink, restarts Apache to apply, and cleans
# up the user-dir config. Does not stop or disable Apache itself (the user
# may have other Apache uses), and does not touch any video files.
#
# Run via:
#   bash <(curl -fsSL https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/local-server/uninstall.sh)

set -euo pipefail

# --- Constants ----------------------------------------------------------------

USER_DIR="$HOME/.macify"
USER_CONF="$USER_DIR/videoserver.conf"
APACHE_CTL="/usr/sbin/apachectl"
APACHE_DROPIN="/private/etc/apache2/other/macify.conf"

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
heading() { printf '\n%s\n' "$(c_cyan "→ $*")"; }

# --- Pre-flight ---------------------------------------------------------------

heading "Pre-flight"

if [ "$(uname -s)" != "Darwin" ]; then
    warn "Not macOS. Nothing to do."
    exit 0
fi

DROPIN_PRESENT=0
USER_CONF_PRESENT=0
[ -e "$APACHE_DROPIN" ] || [ -L "$APACHE_DROPIN" ] && DROPIN_PRESENT=1
[ -e "$USER_CONF" ] && USER_CONF_PRESENT=1

if [ "$DROPIN_PRESENT" = "0" ] && [ "$USER_CONF_PRESENT" = "0" ]; then
    info "Macify local server is not installed. Nothing to do."
    exit 0
fi

# --- Sudo phase: remove drop-in, restart Apache -------------------------------

if [ "$DROPIN_PRESENT" = "1" ]; then
    heading "Removing Apache drop-in (requires sudo)"
    info "macOS will prompt for your password."
    sudo rm -f "$APACHE_DROPIN"
    ok "removed $APACHE_DROPIN"

    if [ -x "$APACHE_CTL" ] && pgrep -x httpd >/dev/null 2>&1; then
        sudo "$APACHE_CTL" restart
        ok "apachectl restart"
    else
        info "Apache is not running — nothing to restart"
    fi
fi

# --- User-dir cleanup ---------------------------------------------------------

if [ "$USER_CONF_PRESENT" = "1" ]; then
    heading "Cleaning user config"
    rm -f "$USER_CONF"
    ok "removed $USER_CONF"

    # Remove ~/.macify if it's now empty (don't nuke if user dropped other files).
    if [ -d "$USER_DIR" ] && [ -z "$(ls -A "$USER_DIR" 2>/dev/null)" ]; then
        rmdir "$USER_DIR"
        ok "removed empty $USER_DIR"
    elif [ -d "$USER_DIR" ]; then
        info "kept $USER_DIR (not empty)"
    fi
fi

heading "Done"
ok "Macify local server uninstalled"
info "Apache itself was left running (in case you use it for other things)."
info "To stop Apache entirely: $(c_dim 'sudo apachectl stop')"
info "To disable Apache at boot: $(c_dim 'sudo launchctl unload -w /System/Library/LaunchDaemons/org.apache.httpd.plist')"
