export class CursorDto<T> {
  data: T[];
  itemsLeft: number;
  limit: number;

  constructor(partial?: Partial<CursorDto<T>>) {
    if (partial)
      Object.assign(this, partial);
  }
}