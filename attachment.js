// Derived from qiwu622/build-standalone ad9e8d6 (MIT). See LICENSE and UPSTREAM.md.
const maxFileContextBytes=8*1024*1024;
const byteLength=text=>new TextEncoder().encode(text).length;
const contextError=(message,status,code)=>Object.assign(new Error(message),{status,code});
export function makeSillyTavernAttachment(input,nonce){
 const name='attachment-1',segments=[],outline=[];let pending=[];
 const flush=()=>{if(pending.length){outline.push(`[CONTEXT segments ${pending[0]}..${pending.at(-1)}: read their exact text and roles from ${name}]`);pending=[];}};
 for(const [index,s] of input.sillytavern.segments.entries()){
  const segment=index+1,meta={segment,message:s.message,part:s.part,role:s.role,source:s.source,placement:s.placement,...(s.name?{name:s.name}:{})};
  if(s.placement==='file'){
   segments.push({...meta,text:s.text});pending.push(segment);
  }else{
   segments.push(meta);flush();
   outline.push(`[INLINE ${nonce} segment=${segment} role=${s.role}${s.name?' name='+JSON.stringify(s.name):''}]\n${s.text}\n[/INLINE ${nonce} segment=${segment}]`);
  }
 }
 flush();
 const text=JSON.stringify({kind:'sillytavern_context',request:nonce,encoding:'Segments preserve original message and part order. Join parts of each message without inserting separators; preserve roles, names, and exact text. Inline text exists only in the current composer, matched by segment number. File text exists only in this attachment.',segments},null,2)+'\n';
 const bytes=byteLength(text);
 if(bytes>maxFileContextBytes)throw contextError('Build 聊天附件超过 8 MiB，请缩短历史',413,'context_too_large');
 const action={continue:'Continue the final assistant message.',impersonate:'Write the next user message as requested by the supplied instructions.',quiet:'Answer the supplied quiet task.'}[input.sillytavern.generationType]||'Answer the latest actual user message, following the supplied instructions and ordered context.';
 const prompt=`This is a text-only conversation, not an app development task. Read the attached text file ${name}. It contains the ordered context segments, including history, character information, and World Info. Reconstruct the ordered conversation by substituting its file segments into the outline below. Preserve roles, names, order, and exact text. Preset instructions are supplied directly INLINE below; their text is not stored in the attachment. Use only this attachment and the current composer as context, not previous project chats or project files. Do not edit project files. ${action} Return the complete answer directly, without a receipt or verification code.\n\n${outline.join('\n\n')}`+(input.requestedMaxOutputTokens?`\nRequested output limit: ${input.requestedMaxOutputTokens} tokens.`:'');
 if(byteLength(prompt)>1024*1024)throw contextError('Build 输入框内容超过 1 MiB 安全大小限制；未截断预设',413,'inline_too_large');
 return {mode:'sillytavern_split',nonce,files:[{name,text,type:'text/plain'}],bytes,prompt};
}

