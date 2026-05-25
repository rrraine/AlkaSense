type BackoffConfig = {
  initialDelay?: number;
  multiplier?: number;
  maxDelay?: number;
  maxAttempts?: number;
};

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: BackoffConfig = {}
): Promise<T> {
  const {
    initialDelay = 2000,
    multiplier = 2,
    maxDelay = 60000,
    maxAttempts = Infinity,
  } = config;

  let delay = initialDelay;
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * multiplier, maxDelay);
    }
  }
}
