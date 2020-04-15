//INFO:

//S: MoverALib
function ser_json_compacto(o) {
	return ser_json(o,1).replace(/,\n\s*([^\s\[])/g,', $1');
}

console.log("LANG0");
GLOBAL=window; GLOBAL.LogLvlMax=1; LogLvl.Max=1 //XXX: sino lib lo sube a 9

SaveNames= 'cmp'.split(' ');
SaveDef= {};
SaveNames.forEach(n => {SaveDef[n]= GLOBAL[n]});

await loadJs("lib/lib2.js"); 
await loadJs("lib/liblang.js");
LogLvlMax=1;
function evalRtl(src,path) { eval(parse_rtl_toSrc_js(src,path)); }
async function loadRtl_url(url) { 
	var src= await get_url_p(url);
	evalRtl(src,url);
}
await loadRtl_url('lib/prelude.rtl');

SaveNames.forEach(n => {GLOBAL[n]= SaveDef[n]});
//------------------------------------------------------------
await loadRtl_url('slides.rtl');

//------------------------------------------------------------
await loadJs('node_modules/microlight/microlight.js');

function codeTryEval(e) {
	var src= e.innerText;
	//DBG: console.log("codeTryEval",e.innerText);
	try { var r= eval(src); alert("Resultado:\n"+ser_json(r,1)); return true; }
	catch (ex) { alert("No se puede evaluar"); console.error("codeTryEval",ex,src); }
}

MiHiglighterTo= null;
miHiglighter= function(code, language, noFontSz) {
		console.log("HIGLIGHT",language,code);
		if (MiHiglighterTo==null) {
			MiHiglighterTo= setTimeout(()=> { microlight.reset(); MiHiglighterTo=null},100);  //XXX:buscar algo con api MENOS horrible
		}
    return '<code class="microlight" style="color: rgba(0,0,0,90); background: #F0F0F0;' + (noFontSz ? '' : 'font-size: .85em;') + '" onclick="codeTryEval(this)">'+code+'</code>';
}

myRenderer= new marked.Renderer();
myRenderer.codespan= function (txt,lang) {
	return miHiglighter(txt,lang);
}
myRenderer.code= function (txt,lang) {
	return '<pre style="border: 1px dotted gray; white-space: pre-wrap; padding: 10px; border-radius: 3px; background: #F0F0F0;">'+miHiglighter(txt,lang)+'</pre>';
}

marked.setOptions({
	highlight: miHiglighter,
	renderer: myRenderer,	
});

//------------------------------------------------------------

loadJs_withTag_p('/node_modules/react-simple-code-editor/browser.js');

Slides= ("\n"+SlidesTexto).split(/\n+-------*/).slice(1);

function scr_lang(my) {
	my.state= { code: "podes escribir : lo que quieras\n\t. aca\n\ten pythonesco", out: '', slide: 0 };

	function evalCode(x) {
		my.setState({ out: ser_json_compacto( ser_rtl_r(my.state.code) ) });
	}

	function onCodeChange(v) {
		my.setState({code: v});
		evalCode();
	}

	evalCode();

	my.render= function () { 
		return {cmp: 'Container', 
			children: (
				my.state.wantsEditor 
				? [
						{cmp: 'div', style: {zIndex: 50, position: 'fixed', top: '1em', width: '90vw'}, children: [
							my.toSet('wantsEditor',false,{children: 'slide', floated: 'right', size:'tiny'}),
						]},
						{cmp: 'div', style: {marginTop: '1em'}, children: [
						{cmp: CodeEditorSimple.default, value: my.state.code, highlight: txt => miHiglighter(txt,'rtl',true) , onValueChange: onCodeChange, style: { background: 'white', color: 'transparent', caretColor: 'green', fontFamily: 'monospace', minHeight: '60%'}}, 
						{cmp: 'div', style: {width: '90vw'}, children: [
						{cmp: 'Button', children: 'eval', size:'tiny', floated: 'right', onClick: evalCode},
						{cmp: 'div', style: {padding: '0.5em'}, children: 'Resultado (json)'},	
						]},
						{cmp: CodeEditorSimple.default, value: my.state.out, highlight: txt => miHiglighter(txt,'rtl',true) , style: { background: 'white', color: 'transparent', caretColor: 'green', fontFamily: 'monospace', minHeight: '60%'}}, 
						]},
					]
				: [
						{cmp: 'div', style: {zIndex: 50, position: 'fixed', width: '90vw'}, children: [
							{cmp: 'Button', icon: 'arrow right', size:'tiny', floated: 'right', onClick: () => my.setState({slide: my.state.slide+1})},
							{cmp: 'Button', icon: 'arrow left', size:'tiny', floated: 'right', onClick: () => my.setState({slide: my.state.slide-1})},
							my.toSet('wantsEditor',true,{children: 'editor', size:'tiny', floated: 'right'}),
						]},
						{cmp: 'Markdown', style: {minHeight: '90vh', maxWidth: '50em', zIndex: 0}, children: Slides[my.state.slide] },
					]
			)
		};
	}
}

//		
