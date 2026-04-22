import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;
}
