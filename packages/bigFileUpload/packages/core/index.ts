import axios, { AxiosRequestConfig, AxiosResponse} from 'axios'
import { type BigFileUploadOptions } from '../types'
import merge from 'lodash/merge'
// import sparkMd5 from 'spark-md5'
export class BigFileUpload{
    static readonly two_mb=2*1024*1024
    static readonly two_gb=BigFileUpload.two_mb*1024
    uploadOptions:BigFileUploadOptions={
        file:undefined,
        md5VerifyUrl:'',
        uploadUrl:'',
        chunkSize:2*BigFileUpload.two_mb,
        concurrency:3,
        onSuccess:function(){},
        onFail:function(){},
        onProgress:function(){},
    }
    paused:Boolean=false
    uploading:Boolean=false
    finalOptions:BigFileUploadOptions
    constructor(options:BigFileUploadOptions){
        // 合并设置 
        this.finalOptions=merge({},this.uploadOptions,options)
    }
    async startUpload(){
        if(this.uploading)return
        const {onSuccess,onFail,onProgress}=this.finalOptions
        onProgress!({
            percent:0,
            currPos:0,
        })
        const uploadFile=this.finalOptions.file!
        this.uploading=true
        this.paused=false
        try {
        //先计算MD5
        const {res:resData,md5}:any=await this.getFileMd5FromServer({file:uploadFile})
        
        if(resData.data.code===200){
            const {data}=resData
    
            const {missChunks:needUploadList}=data.data
            //秒传
            if(resData.data.data.code===200){
                onSuccess(resData.data)
                onProgress?.({
                    percent:100,
                    currPos:100
                })
            }else{
                // 分片上传
                const res=await this.uploadChunks({
                    file:uploadFile,
                    needUploadList,
                    fileHash:md5,
                })
                this.uploading=false
                onSuccess(res)
            }
        }else{
            onFail?.(resData.msg)
            this.uploading=false
        }
        } catch (error) {
            this.uploading=false
            onFail?.(error)
        }
    }
    pause(){
        this.paused=true
        this.uploading=false
    }
    // 计算文件MD5 使用webWorker去增量计算文件md5 优化性能
    // 可以考虑计算文件部分分片的md5去优化性能
    async calculateFileMd5(file:File):Promise<object>{
        return new Promise((resolve,reject)=>{
            const sliceFileWorker = new Worker(new URL('./sliceWorker.ts', import.meta.url), { type: 'module' });
            //   //将文件以及分块大小通过postMessage发送给sliceWorker线程
            sliceFileWorker.postMessage({ targetFile: file,chunkSize:this.finalOptions.chunkSize!})
            //   //分片处理完之后触发onmessage事件
              sliceFileWorker.onmessage = async (e) => {
            //     //获取处理结果
                const { fileHash } = e.data;
                resolve({fileHash})
            }
        })
    
        // return new Promise((resolve,reject)=>{
        //     //初始化分片方法  兼容各个浏览器
        //     const blobSlice=File.prototype.slice||(File.prototype as any).mozSlice||(File.prototype as any).webkitSlice,
        //     chunkSize=this.finalOptions.chunkSize as number,
        //     // 总分片数
        //     totolChunks=file&&Math.ceil(file.size/chunkSize)

        //     //当前已执行分片数
        //     let currentChunk=0
            
        
        //     let fileReader=new FileReader()
        
        //     let spark=new sparkMd5.ArrayBuffer()
         
        //     fileReader.onload=(e)=>{
        //         //当前读取的分块结果 ArrayBuffer
        //         const curFileBlock=e.target?.result as ArrayBuffer
        //         //追加到spark对象中
        //         spark.append(curFileBlock)
        //         currentChunk++

        //         // 判断是否全部读取成功
        //         if(currentChunk>=totolChunks){
        //             const fileHash=spark.end()
        //             resolve({fileHash})
        //         }else{
        //             loadNextChunk()
        //         }

        //     }
        //     fileReader.onerror=(e)=>{
        //         reject(null)
        //     }

        //     const loadNextChunk=()=>{
        //         //计算分片
        //         let start=chunkSize*currentChunk,
        //         //判断分片是否超出文件大小
        //         end=start+chunkSize>=file.size?file.size:start+chunkSize
        //         // 触发onload
        //         fileReader.readAsArrayBuffer(blobSlice.call(file,start,end))
        //     }
        //     loadNextChunk()
        // })
    }
    // 获取 服务器文件md5数据
    async getFileMd5FromServer({file}:{file:File}){
        const {fileHash}:any=await this.calculateFileMd5(file)
        console.warn('hui')
        const chunks=Math.ceil(file.size/this.finalOptions.chunkSize!)
        const res= await axios(
            {
                url:this.finalOptions.md5VerifyUrl,
                method:'post',
                withCredentials:true,
                data:{
                    chunks,
                    md5:fileHash,
                    fileName:file.name
                }
            }
        )
        return {res,md5:fileHash}
    }
    formatRes(res:any){
       
        return {...res.data}
    }

    // 上传分片
    async uploadChunks({file,needUploadList,fileHash}:{file:File,needUploadList:undefined|number[],fileHash:string}):Promise<any>{
        return new Promise((resolve,reject)=>{

  
        const {uploadUrl,chunkSize,onProgress,onFail}=this.finalOptions

        //文件总共分片数 用来计算进度条
        const fileChunkCount=Math.ceil(file.size/chunkSize!)

        // 需要上传的分片数
        needUploadList=needUploadList?needUploadList:Array(fileChunkCount).fill(0).map((item,index)=>index)

        //切片方法 需要兼容浏览器
        const blobSlice=File.prototype.slice||(File.prototype as any).mozSlice||(File.prototype as any).webkitSlice;

        const uploadStep=async()=>{
            let formData=new FormData()


            if(!needUploadList?.length||this.paused)return
            const uploadIdx=needUploadList.pop()
            const startSlice=uploadIdx!*chunkSize!,
            endSlice=startSlice+chunkSize!>file.size?file.size:startSlice+chunkSize!
            const fileSlice=blobSlice.call(file,startSlice,endSlice)
            formData.append('md5',fileHash)
            formData.append('name',file.name)
            formData.append('chunks',fileChunkCount.toString())
            formData.append('chunk',uploadIdx!.toString())
            formData.append('file',fileSlice)
            let defaultRes=await axios({
                method:'post',
                url:uploadUrl,
                data:formData
            })
            const FinalRes=this.formatRes(defaultRes)
            if(this.paused) return
            if(FinalRes.code===200){
                const per=((fileChunkCount-needUploadList.length)/fileChunkCount)*100
                onProgress?.({
                    percent:per,
                    currPos:file.size*per/100
                })
                if(FinalRes.data.uploadComplete){
                    onProgress?.({
                        percent:100,
                        currPos:file.size
                    })
                    resolve(FinalRes.data)
                }else{
                    uploadStep()
                }
            }else{
                reject(new Error('request fail'))
                onFail!('request fail')
            }
     
        }
        //并发线程
        let threadCount=this.finalOptions.concurrency!
        while(threadCount>0){
            uploadStep()
            threadCount--
        }
    })
    }
}