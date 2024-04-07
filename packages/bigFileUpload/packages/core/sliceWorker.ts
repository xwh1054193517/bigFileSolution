import sparkMd5 from 'spark-md5'
self.onmessage = async (e) => {
    //获取文件以及分块大小传输
    const { targetFile,chunkSize } = e.data;
    //分片并计算Hash
    const {  fileHash } = await sliceFile(targetFile,chunkSize);
    //将计算结果通过postMessage发送给主线程
    self.postMessage({ fileHash });
  }
  
async function sliceFile(file:File,chunkSize:number):Promise<any>{
    return new Promise((resolve,reject)=>{
            //初始化分片方法  兼容各个浏览器
            const blobSlice=File.prototype.slice||(File.prototype as any).mozSlice||(File.prototype as any).webkitSlice,
            // chunkSize=this.finalOptions.chunkSize as number,
            // 总分片数
            totolChunks=file&&Math.ceil(file.size/chunkSize)

            //当前已执行分片数
            let currentChunk=0
            
        
            let fileReader=new FileReader()
        
            let spark=new sparkMd5.ArrayBuffer()
         
            fileReader.onload=(e)=>{
                //当前读取的分块结果 ArrayBuffer
                const curFileBlock=e.target?.result as ArrayBuffer
                //追加到spark对象中
                spark.append(curFileBlock)
                currentChunk++

                // 判断是否全部读取成功
                if(currentChunk>=totolChunks){
                    const fileHash=spark.end()
                    resolve({fileHash})
                }else{
                    loadNextChunk()
                }

            }
            fileReader.onerror=(e)=>{
                reject(null)
            }

            const loadNextChunk=()=>{
                //计算分片
                let start=chunkSize*currentChunk,
                //判断分片是否超出文件大小
                end=start+chunkSize>=file.size?file.size:start+chunkSize
                // 触发onload
                fileReader.readAsArrayBuffer(blobSlice.call(file,start,end))
            }
            loadNextChunk()
    })
}
