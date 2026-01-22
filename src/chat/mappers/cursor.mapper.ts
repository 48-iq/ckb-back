import { Injectable } from "@nestjs/common";
import { CursorDto } from "../dto/cursor.dto";


@Injectable()
export class CursorMapper {

  toDto<D, R>(args: {
    itemsLeft: number,
    data: D[];
    dataMapper: (item: D) => R
  }): CursorDto<R> {
    return new CursorDto<R>({
      itemsLeft: args.itemsLeft,
      data: args.data.map(args.dataMapper),
      limit: args.data.length,
    });
  }
}