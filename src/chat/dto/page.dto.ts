export class PageDto<T> {
  data: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;

  constructor(partial?: Partial<PageDto<T>>) {
    if (partial)
      Object.assign(this, partial);
  }
}