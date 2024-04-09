import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
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
  //上传文件
  async uploadFiles(
    @UploadedFiles() file: Array<Express.Multer.File>,
    @Body() body,
  ) {
    //如果已经传完了 没有missChunks时仍会调  把刚上传的文件删掉
    console.log('body', body);
    const { md5, chunk, type, name, chunks } = body;
    const chunkDir = `${uploadDir}/${md5}`;
    const isFolderExist = await isExist(chunkDir);
    const hasFileList = isFolderExist
      ? await listDir(path.join(uploadDir, md5))
      : [];
    if (hasFileList.length === Number(chunks)) {
      fs.rmSync(file[0].path);
      return { uploadComplete: true };
    }

    // 不存在目录
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir);
    }
    // //复制
    //移动到单独目录内
    fs.cpSync(file[0].path, `${chunkDir}/${chunk}`);
    fs.rmSync(file[0].path);

    //判断 文件是否上传完成 根据上传文件夹内的文件与chunks作比较

    let fileList = [];
    if (isFolderExist) {
      fileList = await listDir(path.join(uploadDir, md5));
    }
    let uploadComplete = false;
    if (Number(fileList.length) === Number(chunks)) {
      uploadComplete = true;
      merge(name, md5);
    }

    return {
      uploadComplete,
      ...(uploadComplete ? { url: md5 + '.' + type } : {}),
    };
  }

  @Post('checkFileMd5')
  async checkFileMd5(@Body() body) {
    if (!fs.existsSync(finishDir)) {
      fs.mkdirSync(finishDir);
    }
    const { md5, chunks, fileName } = body;
    const type = getFileExtension(fileName);
    const res: any = await getChunkList(
      path.join(finishDir, md5 + '.' + type),
      path.join(uploadDir, md5),
    );
    const missChunks = [];
    if (res.stat === 2) {
      const mapIdx = Array(Number(chunks))
        .fill(1)
        .map((item, index) => index);
      const { chunkList } = res;
      if (!chunkList.length) return { code: 0 };
      for (const i in mapIdx) {
        if (!chunkList.includes(mapIdx[i])) missChunks.push(mapIdx[i]);
      }
      return {
        code: 0,
        missChunks,
      };
    } else {
      return {
        code: 200,
        url: md5 + '.' + type,
      };
    }
  }
}

async function getChunkList(filePath: string, folderPath: string) {
  let res = {};
  const fileExist = await isExist(filePath);
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

// 文件或文件夹是否存在
function isExist(filePath: string) {
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
function listDir(path: string) {
  return new Promise<any>((resolve, reject) => {
    fs.readdir(path, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data.map(item => Number(item)));
    });
  });
}

function merge(name: string, md5: string) {
  const chunkDir = path.join(uploadDir, md5);
  const files = fs.readdirSync(chunkDir);
  let count = 0;
  let startPos = 0;
  const type = getFileExtension(name);
  files.map(file => {
    const filePath = path.join(chunkDir, file);
    const stream = fs.createReadStream(filePath);
    stream.pipe(
      fs
        .createWriteStream(path.join(finishDir, md5 + '.' + type), {
          start: startPos,
        })
        .on('finish', () => {
          count++;
          if (count === files.length) {
            fs.rm(
              chunkDir,
              {
                recursive: true,
              },
              () => {},
            );
          }
        }),
    );
    startPos += fs.statSync(filePath).size;
  });
}
//获取文件后缀名
function getFileExtension(fileName: string) {
  const extension = fileName.match(/\.([^.]+)$/);
  return extension ? extension[1] : '';
}
