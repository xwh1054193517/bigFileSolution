import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import fs from 'fs';

@Controller('files')
export class FilesController {
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      dest: 'uploads',
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
  ) {
    console.log('body', body);
    console.log('files', files);
    //移动到单独目录内
    // const fileName = body.name.match(/(.+)\-\d+$/)[1];
    // console.log(fileName);
    // const chunkDir = `uploads/chunks_` + fileName;
    // console.log(fileName, chunkDir);
    // 不存在目录
    // if (!fs.existsSync(chunkDir)) {
    //   fs.mkdirSync(chunkDir);
    // }
    // //复制
    // fs.cpSync(files[0].path, `${chunkDir}/${body.name}`);
    // fs.rmSync(files[0].path);
  }
}
