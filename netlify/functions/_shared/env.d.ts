declare global {
  const Netlify: {
    env: {
      get(name: string): string | undefined;
    };
  };
}

export {};
