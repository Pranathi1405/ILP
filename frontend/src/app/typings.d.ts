//Author: Poojitha

// Type declarations for third-party libraries without TypeScript support


declare module '@wiris/mathtype-ckeditor5';
declare module 'marked' {
  const marked: {
    parse(markdown: string): string;
  };
  export default marked;
}
