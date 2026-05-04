import bundledQuotes from '../data/quotes.json';

export function nextQuote(currentContent = null) {
  if (bundledQuotes.length === 0) return null;
  if (bundledQuotes.length === 1) return bundledQuotes[0];
  let pick;
  do {
    pick = bundledQuotes[Math.floor(Math.random() * bundledQuotes.length)];
  } while (pick.content === currentContent);
  return pick;
}
