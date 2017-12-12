import Shader		from "./Shader.js";
import gl			from "../gl.js";

/* SAMPLE ------------------------------------------------------
var p = Downloader.start([
	{type:"shader",file:"fungi/shaders/VecWColor.txt"},
	{type:"image",file:"pic.png", yFlip:false, mips:false }
]).then(function(){			setTimeout(onInit,50);
}).catch(function(error){	console.log(error); });

Promise.all([p]).then(values=>{ console.log(values); },reason =>{ console.log(reason); });
 -------------------------------------------------------------*/

var IsActive		= false,	//Is the downloader currently downloading things
	ActivePromise	= null,		//Refernce to promise created by start
	PromiseResolve	= null,		//Resolve Reference for promise
	PromiseReject	= null,		//Reject Reference for promise
	Queue			= [],		//Queue of items to download
	Complete 		= [];		//Queue of completed items downloaded.

//XHR is how we can download files through javascript
var xhr = new XMLHttpRequest();
xhr.addEventListener("load",	onXhrComplete,false);
xhr.addEventListener("error",	onXhrError,false);
xhr.addEventListener("abort",	onXhrAbort,false);
xhr.addEventListener("timeout",	onXhrTimeout,false);


//------------------------------------------------------------
// Public
//------------------------------------------------------------
function start(queueItems){
	if(IsActive) return;

	//Add Items to the Queue
	if(queueItems != undefined && queueItems.length > 0){
		for(var i=0; i < queueItems.length;i++) Queue.push(queueItems[i]);
	}

	//Create Promise that will do the work in the background.
	if(ActivePromise == null) 
		ActivePromise = new Promise(function(resolve,reject){
			PromiseResolve	= resolve;
			PromiseReject	= reject;
			loadNext();
		});

	IsActive = true;
	return ActivePromise; 
}

//------------------------------------------------------------
// Private
//------------------------------------------------------------
function finalize(isSuccess,errMsg){
	IsActive = false;

	if(isSuccess)	PromiseResolve(); //Can pass data with resolve if needed later
	else			PromiseReject(new Error(errMsg));

	ActivePromise	= null;
	PromiseResolve	= null;
	PromiseReject	= null;
}

function loadNext(){
	if(Queue.length == 0){ finalize(true); return; }
	
	var itm = Queue.pop();
	if(Handlers[itm.type] == undefined){
		finalize(false,"Unknown download handler : " + itm.type);
		return;
	}

	Handlers[itm.type](itm);
}

function get(itm,type){
	//xhr holds the active item incase in the future the call is set
	//to handle multiple downloads at a time with some sort of threadpool.
	//This way each ajax caller holds the download info that can then
	//be sent back to the download complete handler.
	xhr.ActiveItem = itm;
	xhr.open("GET",itm.file);
	xhr.responseType = type;
	try{
		xhr.send();
	}catch(err){
		console.log("xhr err",err);
		finalize(false,err);
	}
}

function getImage(itm){
	var img		= new Image();
	img.ActiveItem	= itm;
	img.onload		= onDownloadSuccess;
	img.onabort		= img.onerror = onDownloadError;
	img.src			= itm.file;
}

function queueAdd(v){ Queue.push(v); }

//------------------------------------------------------------
// Private
//------------------------------------------------------------
//Functionality for actual downloading
function onXhrComplete(e){
	if(e.currentTarget.status != 200){
		finalize(false,"http status : " + e.currentTarget.status + " " + e.currentTarget.statusText);
		return;
	}

	var doSave = Handlers[this.ActiveItem.type](this.ActiveItem,e.currentTarget.response);
	if(!IsActive) return; //Incase of loading error downloader will be stopped.

	if(doSave) Complete.push(this.ActiveItem);

	this.ActiveItem = null;
	loadNext();
}				
function onXhrError(e){		console.log("onXhrError"); }
function onXhrAbort(e){		console.log("onXhrAbort"); }
function onXhrTimeout(e){	console.log("onXhrTimeout"); }

function onDownloadSuccess(){
	var doSave = Handlers[this.ActiveItem.type](this.ActiveItem,this);
	if(!IsActive) return; //Incase of loading error downloader will be stopped.

	if(doSave) Complete.push(this.ActiveItem);

	this.ActiveItem = null;
	loadNext();
}

function onDownloadError(){ console.log("Error getting ",this); }

//------------------------------------------------------------
// Handlers
//------------------------------------------------------------
//Downloader is suppose to be expandable by adding new ways to handle
//different types of files for downloading.
var Handlers = {
	//................................................
	"shader":function(itm,dl){
		if(dl == undefined){ get(itm,"text"); return false; }

		var rtn = {shader:null,materials:null,vertex:null,fragment:null};
		var posA, posB, txt;

		//Loop threw the rtn struct to find all the tag elements that should be in the text file
		//THen parse out the text and save it to the object.
		for(var itm in rtn){
			posA	= dl.indexOf("<" + itm + ">") + itm.length + 2;
			posB	= dl.indexOf("</" + itm + ">");
			txt		= dl.substring(posA,posB);

			switch(itm){
				case "shader": case "materials": //These are JSON elements, parse them so they're ready for use.
					try{ rtn[itm] = JSON.parse(txt); }
					catch(err){ finalize(false,itm.file +" : "+ err.message); return false; }

					break;
				default: rtn[itm] = txt.trim();
			}
		}

		Shader.load(rtn); //Call fungi to load shader to GPU
		return false;
	},

	//................................................
	"image":function(itm,dl){
		if(dl == undefined){ getImage(itm); return false; }

		gl.loadTexture(itm.name,dl,itm.yFlip,itm.mips);
		return false;
	}
};

//------------------------------------------------------------
// Export
//------------------------------------------------------------
export default {
	start:start,
	complete:Complete,
	handlers:Handlers,
	api:{ get:get, queueAdd:queueAdd }
}