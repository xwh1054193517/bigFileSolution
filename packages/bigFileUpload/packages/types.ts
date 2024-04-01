export interface BigFileUploadOptions{
    file:File|undefined,//需要上传的文件
    md5VerifyUrl:string,//获取md5分片信息的url
    headers?:object,//请求头参数-未知用处
    uploadUrl:string,//上传文件的url
    concurrency?:number,//并发上传数量
    chunkSize?:number,//分片大小
    onSuccess(res:any):void,//上传成功回调函数-必传
    onProgress?(res:any):void,//上传成功回调函数
    onFail?(res:any):void,//上传成功回调函数
}