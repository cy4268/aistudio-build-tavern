import {WIRE_PREFIX,isBuildConnection,excludedSampling} from './transport.js';
import {makeSillyTavernAttachment} from './attachment.js';

const fail=code=>{throw Object.assign(new Error(code),{code});};
function base64(text){
 const bytes=new TextEncoder().encode(text),chunks=[];
 for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
 return btoa(chunks.join(''));
}

// Replace only the final wire format; keep upstream's source tagging and ordering.
export function applyDirectOutgoing(data,envelope){
 if(!isBuildConnection(data))return;
 if(typeof envelope?.content!=='string'||!envelope.content.startsWith(WIRE_PREFIX))fail('broken_boundary');
 const value=JSON.parse(envelope.content.slice(WIRE_PREFIX.length));
 if(value.version!==1)fail('broken_boundary');
 let body={model:'build-st/adapter-error',messages:[]};
 if(!value.error){
  if(data.chat_completion_source!=='custom')fail('custom_connection_required');
  const match=/^build-st\/(gemini-3\.8-flash|gemini-4-argon)(?:-(low|medium|high))?$/.exec(data.model);
  if(!match)fail('unsupported_build_model');
  if(!Array.isArray(value.segments)||!value.segments.length)fail('broken_boundary');
  const max=data.max_completion_tokens??data.max_tokens;
  if(max!==undefined&&(!Number.isSafeInteger(max)||max<1||max>1000000))fail('invalid_output_limit');
  const nonce=Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
  const context=makeSillyTavernAttachment({sillytavern:value,requestedMaxOutputTokens:max},nonce);
  body={model:match[1]+'-build',reasoning_effort:match[2]||'high',messages:[{role:'user',content:[
   {type:'text',text:context.prompt},
   {type:'file',file:{filename:context.files[0].name,file_data:'data:text/plain;base64,'+base64(context.files[0].text)}},
  ]}]};
 }
 // ST catches listener exceptions. On failure send an invalid model and empty
 // messages, so the existing backend rejects before selecting a Google account.
 const exclude=[...excludedSampling.filter(k=>k!=='reasoning_effort'),'max_tokens','max_completion_tokens'];
 for(const key of exclude)delete data[key];
 Object.assign(data,body);
 if(data.chat_completion_source==='custom'){
  data.custom_include_body=JSON.stringify(body);
  data.custom_exclude_body=JSON.stringify(exclude);
  data.custom_prompt_post_processing='';
 }
}
