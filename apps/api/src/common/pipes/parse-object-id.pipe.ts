import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const MONGO_OBJECT_ID = /^[a-fA-F\d]{24}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID = /^c[a-z0-9]{8,}$/i;
const CUID2 = /^[a-z][a-z0-9]{23,}$/i;

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const input = value?.trim();
    if (!input) {
      throw new BadRequestException('Invalid id format');
    }

    if (
      MONGO_OBJECT_ID.test(input) ||
      UUID.test(input) ||
      CUID.test(input) ||
      CUID2.test(input)
    ) {
      return input;
    }

    throw new BadRequestException('Invalid id format');
  }
}
