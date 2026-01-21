import { Injectable } from "@nestjs/common";
import { PageDto } from "../dto/page.dto";


@Injectable()
export class PageMapper {

  toDto<D, R>(args: {
    page: number;
    size: number;
    totalItems: number;
    data: D[];
    dataMapper: (item: D) => R
  }): PageDto<R> {
    const totalPages = Math.ceil(args.totalItems / args.size);
    return new PageDto<R>({
      data: args.data.map(args.dataMapper),
      page: args.page,
      size: args.size,
      totalItems: args.totalItems,
      totalPages
    });
  }
}