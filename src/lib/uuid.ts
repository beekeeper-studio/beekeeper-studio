export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Date.now() + Math.random() * 16) % 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);

    return value.toString(16);
  });
}
