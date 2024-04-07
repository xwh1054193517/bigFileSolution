<script setup lang="ts">
import { ref } from 'vue'
import { BigFileUpload } from '../../packages/index'
const inputRef = ref('')
let progress=ref(0)
const bfu = new BigFileUpload({
    file: undefined,
    md5VerifyUrl: '/api/files/checkFileMd5',
    uploadUrl: '/api/files/upload',
    concurrency: 2,
    chunkSize: 2 * 1024 * 100,

    onProgress: ({percent, currPos}) => {
      progress.value=percent
      console.warn('onProgress', percent, currPos)
    },
    onSuccess: res => {
      console.warn('onSuccess', res)
    },
    onFail: err => {
      console.error(err)
    }
})


function fileChange(event: any) {
  const file = event.target?.files[0]
  if(file) {
    bfu.finalOptions.file = file
  }
}



function upload() {
  if(!bfu.finalOptions.file) return console.error('请选择上传文件')
  // 开始上传
  bfu.startUpload()
}
function pause() {
  bfu.pause()
}
</script>

<template>
  <div>
    <input type="file" ref="inputRef" @change="fileChange"/>
    <div>上传进度{{ progress }}</div>
    <button @click="upload">上传</button>
    <button @click="pause">暂停</button>
  </div>
</template>
