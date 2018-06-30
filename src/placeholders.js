
const placeholders = [
  'Type words, receive emoji 👍',
  'Use your keyboard to search 🔎',
  'Find emoji that your heart desires ❤️⌨️',
  'Keyboard. Emoji. Forever 😍',
  'Keyboard emoji since 2016 📜',
  'Just tap a key to search 👆',
  'Type, tap enter to copy, profit 💸',
  'Emoji for every occasion, just type 🔡',
];

const choice = Math.floor(Math.random() * placeholders.length);
typer.placeholder = placeholders[choice];
