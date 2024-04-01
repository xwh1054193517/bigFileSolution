import axios, { AxiosRequestConfig, AxiosResponse} from 'axios'
import { type BigFileUploadOptions } from '../types'
import merge from 'loadsh/merge'
import sparkMd5 from 'spark-md5'
class BigFileUpload{
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
    finalOptions:BigFileUploadOptions
    constructor(options:BigFileUploadOptions){
        // 合并设置 
        this.finalOptions=merge({},this.uploadOptions,options)
    }
    async startUpload(){
        const {onSuccess,onFail,onProgress}=this.finalOptions
        const uploadFile=this.finalOptions.file!
        try {
        //先计算MD5
        const {res:resData,fileHash,chunkList}:any=this.getFileMd5FromServer({file:uploadFile})
        if(resData.code===200){
            const {data}=resData
            const {needUploadList}=data

            //秒传
            if(!needUploadList.length){
                onSuccess(resData.data)
                onProgress?.({
                    percent:100,
                    total:100
                })
            }else{
                // 分片上传
                const res=await this.uploadChunks({
                    file:uploadFile,
                    needUploadList,
                    fileHash,
                    chunkList
                })
                onSuccess(res.data)
            }
        }else{
            onFail?.(resData.msg)
        }
        } catch (error) {
            onFail?.(error)
        }
    }
    // 计算文件MD5
    async calculateFileMd5(file:File):Promise<object>{
        return new Promise((resolve,reject)=>{
            //初始化分片方法  兼容各个浏览器
            const blobSlice=File.prototype.slice||(File.prototype as any).mozSlice||(File.prototype as any).webkitSlice,
            chunkSize=this.finalOptions.chunkSize as number,
            // 总分片数
            totolChunks=file&&Math.ceil(file.size/chunkSize)

            //当前已执行分片数
            let currentChunk=0
            
            // 已收集的分片
            let chunkList:any=[]

            let fileReader=new FileReader()
        
            let spark=new sparkMd5.ArrayBuffer()

            fileReader.onload=(e)=>{
                //当前读取的分块结果 ArrayBuffer
                const curFileBlock=e.target?.result as ArrayBuffer
                //追加到spark对象中
                spark.append(curFileBlock)
                currentChunk++
                chunkList.push(curFileBlock)
                
                // 判断是否全部读取成功
                if(currentChunk>=totolChunks){
                    const fileHash=spark.end()
                    resolve({chunkList,fileHash})
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
        })
    }
    // 获取 服务器文件md5数据
    async getFileMd5FromServer({file}:{file:File}){
        const {chunkList,fileHash}:any=await this.calculateFileMd5(file)
        const res= await axios(
            {
                url:this.finalOptions.md5VerifyUrl,
                method:'post',
                withCredentials:true,
                data:{
                    fileHash,
                    fileName:file.name
                }
            }
        )
        return {res,fileHash,chunkList}
    }
    formatRes(res:any){
        const responseData={...res.data};
        (responseData.code=responseData.code||responseData.errcode===0?200:responseData.errcode);
        (responseData.msg=responseData.msg||responseData.errmsg)
        return responseData
    }

    // 上传分片
    async uploadChunks({file,needUploadList,fileHash,chunkList}:{file:File,needUploadList:[],fileHash:String,chunkList:[]}):Promise<any>{
        const {uploadUrl,chunkSize,onProgress}=this.finalOptions
        //文件总共分片数 用来计算进度条
        const fileChunkCount=Math.ceil(file.size/chunkSize!)

        const blobSlice=File.prototype.slice||(File.prototype as any).mozSlice||(File.prototype as any).webkitSlice;

        let formData=new FormData()
        
    }
}