import { useRef } from 'react';

/** Keeps a ref to the latest value for stable callbacks/effects (Vercel useLatest pattern). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
