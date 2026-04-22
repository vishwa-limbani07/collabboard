import { IsEmail, IsString, MinLength } from 'class-validator';

// DTOs are like Angular form validators — but for your API inputs
// Instead of Validators.required in Angular, you use @IsString() here
export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
