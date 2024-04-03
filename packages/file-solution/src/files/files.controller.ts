import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  flatten,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
const finishDir = 'finish';
const uploadDir = 'uploads';
@Controller('files')
export class FilesController {
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('file', 20, {
      dest: uploadDir,
    }),
  )
  uploadFiles(@UploadedFiles() file: Array<Express.Multer.File>, @Body() body) {
    console.log('files', file);
    const { md5, chunk, size, name } = body;
    //移动到单独目录内
    // const fileName = body.name.match(/(.+)\-\d+$/)[1];
    // console.log(fileName);
    const chunkDir = `${uploadDir}/${md5}`;
    // console.log(fileName, chunkDir);
    // 不存在目录
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir);
    }
    // //复制
    fs.cpSync(file[0].path, `${chunkDir}/${chunk}`);
    fs.rmSync(file[0].path);
    return {
      uploadComplete: false,
    };
  }

  @Post('checkFileMd5')
  async checkFileMd5(@Body() body) {
    if (!fs.existsSync(finishDir)) {
      fs.mkdirSync(finishDir);
    }
    const { md5, fileName } = body;
    const res = await getChunkList(
      path.join(finishDir, fileName),
      path.join(uploadDir, md5),
    );
    return {
      code: 0,
      res,
    };
  }
}

async function getChunkList(filePath, folderPath) {
  let res = {};
  const fileExist = false;
  if (fileExist) {
    res = {
      stat: 1,
      file: {
        isExist: true,
        name: filePath,
      },
    };
  } else {
    const isFolderExist = await isExist(folderPath);
    let fileList = [];
    if (isFolderExist) {
      fileList = await listDir(folderPath);
    }
    res = {
      stat: 2,
      chunkList: fileList,
      desc: 'folder list',
    };
  }
  return res;
}
// 文件夹是否存在, 不存在则创建文件
function folderIsExit(folder) {
  return fs.existsSync(path.join(folder));
}
// 文件或文件夹是否存在
function isExist(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      // 文件不存在
      if (err && err.code === 'ENOENT') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// 列出文件夹下所有文件
function listDir(path) {
  return new Promise<any>((resolve, reject) => {
    fs.readdir(path, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}
