<script setup lang="ts">
import { BigFileDownLoad } from '../packages/index'

function downloadFile(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

const filename = 'ruoyi-vue-pro-master的副本.zip'
const dl = new BigFileDownLoad({
  // url: '/ggzy-portal-admin/base/file/download/' + fileId, // 必填
  // fileSizeUrl: '/ggzy-portal-admin/base/file/download/size/' + fileId,
  url: '/ruoyi-vue-pro-master的副本.zip',
  // chunkSize: 25 * 1024 * 1024,
  rangeRightClose: false,
  concurrency: 6,
  headers: {
    token: '123456'
  },
  onSize: ({ size }) => {
    console.log('file size: ', size)
  },
  onProgress: ({percent, loaded}) => {
    console.log('onProgress', percent, loaded)
  },
  onSuccess: res => {
    console.log('onSuccess', res)
    downloadFile(res, filename)
    // window.open(URL.createObjectURL(res))
  },
  onError: err => {
    console.error(err)
  }
})

function download() {
  // 开始下载
  dl.download()

  // 暂停下载
  // md.pause()
}
function pause() {
  dl.pause()
}
</script>

<template>
  <div>
    <button @click="download">下载</button>
    <button @click="pause">暂停</button>
  </div>
</template>
