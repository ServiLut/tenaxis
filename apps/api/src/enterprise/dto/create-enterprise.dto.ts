import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEnterpriseDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
