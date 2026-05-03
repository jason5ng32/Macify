chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'options/index.html' });
    return;
  }
  if (details.reason === 'update') {
    // Only on a major-version bump (e.g., 1.x → 2.x). Patch updates
    // shouldn't keep popping the settings tab.
    const prevMajor = (details.previousVersion ?? '').split('.')[0];
    const nowMajor = chrome.runtime.getManifest().version.split('.')[0];
    if (prevMajor && prevMajor !== nowMajor) {
      chrome.tabs.create({ url: 'options/index.html' });
    }
  }
});
