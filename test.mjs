import assert from 'node:assert/strict';
import {createTagger,hookPromptManager,readPresetSegments,prepareOutgoing,errorEnvelope} from './transport.js';
import {applyDirectOutgoing} from './direct.js';

// One integration regression: source tagging -> ordered attachment -> native request.
const tagger=createTagger('1234567890abcdef12345678');
const manager={serviceSettings:{prompts:[]},preparePrompt:prompt=>({...prompt})};
hookPromptManager(manager,tagger,()=>true);
const preset='预设：保持中文。\n  Unicode 🌊';
const background='世界书：海边的暗号是 tide-481。\n\t原样保留';
const messages=[
 {role:'system',content:manager.preparePrompt({identifier:'main',content:preset}).content+manager.preparePrompt({identifier:'worldInfoBefore',content:background}).content},
 {role:'assistant',name:'骑士',content:'此前的回答。'},
 {role:'user',content:'请读出暗号。'},
];
const segments=readPresetSegments(messages,tagger,{latestUserText:'请读出暗号。'});
const data={chat_completion_source:'custom',model:'build-st/gemini-3.8-flash-low',messages,stream:true,max_tokens:96,temperature:0.8};
const envelope=prepareOutgoing(data,{segments,generationType:'continue'},{inlineTokens:35});
applyDirectOutgoing(data,envelope);
const body=JSON.parse(data.custom_include_body);
assert.equal(body.model,'gemini-3.8-flash-build');
assert.equal(body.reasoning_effort,'low');
assert.equal(data.stream,true);
assert.equal(body.messages.length,1);
const [prompt,file]=body.messages[0].content;
assert.equal(prompt.type,'text');
assert.ok(prompt.text.includes(preset));
assert.ok(prompt.text.includes('Continue the final assistant message.'));
assert.ok(!prompt.text.includes(background));
assert.ok(prompt.text.includes('attachment-1'));
const attachment=JSON.parse(Buffer.from(file.file.file_data.split(',')[1],'base64').toString('utf8'));
assert.ok(!JSON.stringify(attachment).includes(preset));
assert.equal(attachment.segments[1].text,background);
assert.deepEqual(attachment.segments.map(s=>[s.message,s.part,s.role,s.name]),segments.map(s=>[s.message,s.part,s.role,s.name]));
assert.equal(body.max_tokens,undefined); // only a prompt hint; the RPC has no hard token limit
assert.ok(JSON.parse(data.custom_exclude_body).includes('temperature'));
assert.ok(!JSON.parse(data.custom_exclude_body).includes('reasoning_effort'));
assert.ok(!JSON.stringify(body).includes(tagger.prefix));
const ordinary={chat_completion_source:'custom',model:'gemini-3.8-flash-build',messages:[{role:'user',content:'untouched'}]};
const snapshot=structuredClone(ordinary);
applyDirectOutgoing(ordinary,envelope);
assert.deepEqual(ordinary,snapshot);
const blocked={chat_completion_source:'custom',model:'build-st/gemini-3.8-flash'};
applyDirectOutgoing(blocked,errorEnvelope('broken_boundary'));
const rejection=JSON.parse(blocked.custom_include_body);
assert.equal(rejection.model,'build-st/adapter-error');
assert.deepEqual(rejection.messages,[]);
const reverse={chat_completion_source:'openai',reverse_proxy:'https://example.invalid/v1',model:'build-st/gemini-3.8-flash',max_tokens:96};
assert.throws(()=>applyDirectOutgoing(reverse,envelope),/custom_connection_required/);
applyDirectOutgoing(reverse,errorEnvelope('custom_connection_required'));
assert.equal(reverse.model,'build-st/adapter-error');
assert.deepEqual(reverse.messages,[]);
assert.throws(()=>applyDirectOutgoing({chat_completion_source:'custom',model:'build-st/unknown'},envelope),/model/);
console.log('PASS: preset/background split, Unicode/order, native attachment, model/thinking, rejection, ordinary route isolation');
