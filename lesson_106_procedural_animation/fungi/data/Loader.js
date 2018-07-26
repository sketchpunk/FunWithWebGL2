import gl from "../gl.js";
import { ParseShaderFile, LoadShader, LoadMaterials }	from "../Shader.js";

export default class Loader{

	//------------------------------------------------------
	// Textures
	//------------------------------------------------------
		//Push Images to the GPU to be used as textures
		static textures( ary ){
			var itm,  doYFlip, useMips, w, h, aryLen;
			for(itm of ary){
				if(itm.type != "image") continue;

				doYFlip = (itm.doYFlip == true);
				useMips = (itm.useMips == true);

				if(itm.arrayLen){ //If Texture Array, load up differently
					gl.loadTextureArray(itm.name, itm.download, itm.w, itm.h, itm.arrayLen, doYFlip, useMips);// , wrapMode=0, filterMode=0
				}else{
					gl.loadTexture(itm.name, itm.download, doYFlip, useMips);
				}
			}
		}
	//endregion


	//------------------------------------------------------
	// Shader & Materials
	//------------------------------------------------------
		static materials( ary ){
			var itm;
			for(itm of ary){
				if(itm.materials && itm.materials.length > 0) LoadMaterials(itm);
			}
		}

		//Just filter out Snippets from the download list
		static getSnippets( ary ){
			var itm, snipAry = new Map();
			for(itm of ary){
				if(itm.type == "snippet") snipAry.set(itm.file, itm.download);
			}
			return snipAry;
		}

		static compileShaders( ary ){
			var itm;
			for(itm of ary){
				if(LoadShader(itm) == null) return false;
			}
			return true;
		}

		//Handle Snippets for shader text, then handle JSON parsing
		//of Shader and material information. Return list of shader JSON.
		static parseShaders( ary, mapSnip ){
			//................................................
			var itm, txt, tmp, rtn = new Array();
			for(itm of ary){
				if(itm.type != "shader") continue;
				txt = itm.download;

				//------------------------------------
				// Check if there is any Snippets that needs to be
				// Inserted into the shader code
				if(itm.snippets){
					for(var i=0; i < itm.snippets.length; i++){
						txt = txt.replace(
							new RegExp("#snip " + itm.snippets[i], 'gi'),
							mapSnip.get(itm.snippets[i])
						);
					}
				}

				//------------------------------------
				tmp = ParseShaderFile(txt);
				if(tmp == null)	return null;
				else 			rtn.push(tmp);
			}

			return rtn;
		}
	//endregion

}//cls