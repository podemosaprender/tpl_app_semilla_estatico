LangLogLvl= 10;

MiEval= GLOBAL.evalm;
RTLKeepMacros= false;
EOL="\n";
TAB="\t";
EOL_RE=/\r?\n/g;
SPACE1_RE=/\s+/g;
first= function (a) { return a!=null ? a[0] : null; }
second= function (a) { return a!=null ? a[1] : null; }
rest= function (a) { return Array.prototype.slice.call(a,1);}
push= function (a,es) { a.push.apply(a,rest(arguments)); return a; }
unshift= function (a,es) { a.unshift.apply(a,rest(arguments)); return a; }
push_v= function (a,es) { a.push.apply(a,es); return a; }
fArgsCopy= this.fArgsCopy || function(a,idxMin,dst) { //U: copiar "arguments" a un array, USAR esta separada en una linea asi la podemos reemplazar por una macro porque v8 NO optimiza las funciones que hacen cosas raras con arguments :P
  var r= Array.prototype.slice.call(a,idxMin||0);
  return dst ? dst.concat(r) : r;
}

//GLOBAL.DbgCtl= {parse_wisp: 1, cada_l: 1};
//GENERADO de parse_pythonlinke_wisp.rtl
{
(WISP_SEP_TERM_RE=/\s+:\s+/);
(WISP_PFX_RE=/^([\s_]*\s|)(.*)/);
(parse_wisp=function parse_wisp(str) {
var LogWrap_name="parse_wisp";
var LogWrap_logl=((GLOBAL.DbgCtl&&GLOBAL.DbgCtl["parse_wisp"])||9);
var logme=function parse_wisp_logmv(m,more,l,t) {
logm((t||"DBG"), (l||LogWrap_logl), ("FN "+LogWrap_name+" "+m), {"logme": more, "str": str, })}


logm("DBG", LogWrap_logl, "FN parse_wisp", {"str": str, });
var _t0=null;
var _t1=null;
var LogWrap_ff=function parse_wisp_logWrapped() {
(str=(str+EOL+"END"+EOL));
var St=[{"l": -1, "v": [], }];
fold(((""+str)).split(EOL_RE), function cada_l(l,l_k,l_acc,l_stop,l_col) {
var LogWrap_name="cada_l";
var LogWrap_logl=((GLOBAL.DbgCtl&&GLOBAL.DbgCtl["cada_l"])||9);
var logme=function cada_l_logmv(m,more,l,t) {
logm((t||"DBG"), (l||LogWrap_logl), ("FN "+LogWrap_name+" "+m), {"logme": more, "l": l, "l_k": l_k, "l_acc": l_acc, "l_stop": l_stop, "l_col": l_col, })}


logm("DBG", LogWrap_logl, "FN cada_l", {"l": l, "l_k": l_k, "l_acc": l_acc, "l_stop": l_stop, "l_col": l_col, });
var _t0=null;
var _t1=null;
var LogWrap_ff=function cada_l_logWrapped() {
var pfxm=((Re_last_match=((""+l)).match(WISP_PFX_RE)));
var pfx=((""+pfxm[1])).replace(TAB,"  ");
var pfxl=length(pfx);
var toks_str=pfxm[2];
if ((length(toks_str)==0)) {
return(false)
}

var tok_terms=(((""+toks_str)).split(WISP_SEP_TERM_RE)).map(function (term_str) {return(((""+term_str)).split(SPACE1_RE))});
logm("DBG", LangLogLvl, "WISP TERMS", {"tok_terms": tok_terms, "toks_str": toks_str, });
var toks=((1<length(tok_terms)) ? push_v(first(tok_terms), rest(tok_terms)) : (((0<pfxl)&&((Re_last_match=((""+first(tok_terms))).match(/^(\$EXP\$\d+\$|\$STR\$\d+\$)/)))) ? unshift(first(tok_terms), ".") : first(tok_terms)));
var tos=first(St);
var tosl=tos["l"];
logm("DBG", LangLogLvl, "WISP LINE", {"l_k": l_k, "pfxl": pfxl, "tosl": tosl, "toks": toks, "l": l, "tos": tos, "St": St, });
while ((pfxl<=tosl)) {{
var x=(St).shift();
(tos=first(St));
(tosl=tos["l"]);
push(tos["v"], x["v"]);
logm("DBG", LangLogLvl, "WISP POP", {"pfxl": pfxl, "tosl": tosl, "tos": tos, "St": St, });
}
}
if ((first(toks)==".")) {
{
push_v(tos["v"], rest(toks));
logm("DBG", LangLogLvl, "WISP CONCAT", {"pfxl": pfxl, "St": St, });
}

} else {
  {
logm("DBG", LangLogLvl, "WISP PUSH", {"pfxl": pfxl, "St": St, });
(St).unshift({"l": pfxl, "v": toks, });
}

}

}


try {var LogWrap_rr=(LogWrap_ff).apply(this,[])}catch(wrapEx){
logmex("ERR", 1, "FN cada_l", {"l": l, "l_k": l_k, "l_acc": l_acc, "l_stop": l_stop, "l_col": l_col, }, wrapEx);
throw(wrapEx);
}

logm("DBG", LogWrap_logl, "FN cada_l R", {"l": l, "l_k": l_k, "l_acc": l_acc, "l_stop": l_stop, "l_col": l_col, "result": LogWrap_rr, });
return(LogWrap_rr);
}

, null, null);
var r=second(St)["v"];
logm("DBG", LangLogLvl, "WISP r", {"r": r, });
return(r);
}


try {var LogWrap_rr=(LogWrap_ff).apply(this,[])}catch(wrapEx){
logmex("ERR", 1, "FN parse_wisp", {"str": str, }, wrapEx);
throw(wrapEx);
}

logm("DBG", LogWrap_logl, "FN parse_wisp R", {"str": str, "result": LogWrap_rr, });
return(LogWrap_rr);
}

);
}

parse_str = function (src, dst) {
    return src.replace(/"(((\\[^])|([^"\\]*))*)"/g, function (x, x1) {
        var snorm = x1.replace(/\\([^])/g, function (s, s1) {
            return s1 == '"' ? s1 : s;
        });
        var k = dst.push(snorm) - 1;
        return '$STR$' + k + '$';
    });
};
parse_exp = function (src, dst) {
    return src.replace(/([@,'`#]*)\((\s*[^()]*)?\)/g, function (x, xS, x1) {
        logm('DBG', LangLogLvl, 'PARSE_EXP', {
            'xS': xS,
            'x1': x1
        });
        var tnorm = [];
        if (x1)
            x1.replace(/\s+$/, '').replace(/\s*([@,'`#]*)([^\s]+)/g, function (x, xS, x1) {
                tnorm.push(xS ? '$EXP$' + (dst.push([
                    xS,
                    x1
                ]) - 1) + '$' : x1);
            });
        var k = dst.push(tnorm) - 1;
        if (xS)
            k = dst.push([
                xS,
                '$EXP$' + k + '$'
            ]) - 1;
        return '$EXP$' + k + '$';
    });
};
parse_comments = function (src) {
    return src.replace(/;.*/g, '');
};
parse = function (src) {
    var STR = [];
    var EXP = [];
    var no_str = parse_str(src, STR);
    var no_comments = parse_comments(no_str);
    var no_exp = no_comments;
    var no_exp2 = '';
    while (no_exp != no_exp2) {
        no_exp2 = no_exp;
        no_exp = parse_exp(no_exp, EXP);
    }

		var exp_wisp= parse_wisp(no_exp);
		exp_wisp= exp_wisp.map(function (e) { return first(e).match(/^\$EXP\$/) ? first(e) : e });
		exp_wisp.unshift('block');
		EXP.push(exp_wisp);
		no_exp_ni_wisp= "$EXP$"+(EXP.length-1)+"$";
		logm("DBG",9,"parsex",{no_exp: no_exp, exp_wisp: exp_wisp});
    var r= {
        main: no_exp_ni_wisp,
        str: STR,
        exp: EXP
    };
		logm('DBG',9,"parse",r);
		return r;
};

toArrays = function (t, pe) {
    logm('DBG', LangLogLvl, 'toArrays', t);
    if (t != null && typeof t == 'object' && !Array.isArray(t))
        return toArrays(t.main, t);
    else if (Array.isArray(t))
        return t.map(function (tp) {
            return toArrays(tp, pe);
        });
    else {
        var m = (""+t).match(/\$(EXP|STR)\$(\d+)\$/);
        return m ? m[1] == 'EXP' ? toArrays(pe.exp[m[2]], pe) : ser_json(pe.str[m[2]]) : t;
    }
};

concat = function (a1, a2) {
    return a1.concat(a2);
};
qq_impl = function (e, i, acc) {
    if (i >= e.length)
        return acc;
    else {
        var ei = e[i];
        logm('DBG', LangLogLvl, 'QQ', {
            'i': i,
            'ei': ei,
            'acc': acc
        });
        if (Array.isArray(ei)) {
            var h = ei[0];
            if (h == ',@') {
                var restA = qq_impl(e, 1 + i, []);
                var estoA = 1 < acc.length ? [
                        'concat',
                        acc,
                        ei[1]
                ] : ei[1];
                if (1 > restA.length)
                    return estoA;
                else
                return [
                    'concat',
                        estoA,
                        concat(['array'], restA)
                ];
            } else if (h == ',')
                return qq_impl(e, 1 + i, concat(acc, [ei[1]]));
            else
                return qq_impl(e, 1 + i, concat(acc, [qq_impl(ei, 0, ['array'])]));
        } else
            return qq_impl(e, 1 + i, concat(acc, [ser_json(ei)]));
    }
};
qq = function (e) {
    return qq_impl([e], 0, [])[0];
};

function ensure_block(b) {
	b= (b||"")+""; 
	return (b.match(/^[\s\r\n]*\{/) && b.match(/\}[\s\r\n]*$/)) ? b : '{\n' + b + '}\n';
}

logGEN= function (msg) {
	logm("DBG",1,"GEN "+msg,GLOBAL.GEN!=null ? Object.keys(GLOBAL.GEN): "NOT DEFINED");
}
ensure_var("GEN", {}, GLOBAL); //A: solo si no estaba, para que no nos borre las macros
GEN['GenEval'] = function (t, pe) {
		logm("DBG",LangLogLvl,"RTL GenEval MACROS",Object.keys(GEN));
		var src= toSrcJs(t[1], pe);
		try { MiEval(src,ser_json(t),null) } catch(evalex) { logmex("ERR",1,"EVAL",src,evalex); print("EVAL_EX/JS=\n"+src); }
		if (RTLKeepMacros) {
			return '\n'+src+'\n';
		}
};
GEN['GenMacro'] = function (t, pe) {
    var name = t[1];
    var funargs = toArrays(t[2],pe);
    var funexp = t[3];
    logm('DBG', LangLogLvl, 'MACRO DEF', t);
    var isRest = false;
    if (funargs.length) {
        var funargR = funargs.pop();
        if ('&' == funargR[0]) {
            isRest = true;
            funargR = funargR.substring(1);
        funexp = [
            'block',
            [
                '=',
                funargR,
                [
                    'fArgsCopy',
                    'arguments',
                    funargs.length 
                ]
            ],
            funexp
        ];
				}
        funargs.push(funargR);
    }
    var funjs = toSrcJs([
        'lambda',
        funargs,
        funexp
    ], pe);
    logm('DBG', LangLogLvl, 'MACRO DEF IMPL', funjs + '');
    var fun;
    var src= "function (t, pe) { logm('DBG', LangLogLvl, 'MACRO USE', [ '"+name+"', t ]); \n"+
			"var fun= "+ funjs +";\n" +
			"return toSrcJs(fun.apply(null, toArrays(Array.prototype.slice.call(t, 1), pe), pe));\n"+
		"}";
		//DBG: console.log("XXX",src);

		try { fun= MiEval("fun="+src,"GenMacro="+name,null) } catch(evalex) { logmex("ERR",1,"EVAL",src,evalex);print("EVAL_EX/JS=\n"+src); }
		logm("DBG",LangLogLvl,"MACRO FUN",{fun: ""+fun, src: src});
    GEN[name] = fun;
		
		if (RTLKeepMacros) {
			return '\nGEN["'+name+'"]= '+src+";\n";
		}
};
GEN['js'] = function (t, pe) {
    return Array.prototype.slice.call(t, 1).map(function (t1) {
        return 'string' == typeof t1 ? t1.match(/^\$(STR)\$(\d+)\$$/) ? ser_json_r(toSrcJs(t1, pe)) : (t1.match(/^\"/) && t1.match(/\"$/)) ? ser_json_r(t1) : toSrcJs(t1, pe) : toSrcJs(t1, pe);
    }).join('');
};
GEN['forin'] = function (t, pe) {
    return 'for ' + t[1][1] + ' in (' + toSrcJs(t[2], pe) + ') ' + toSrcJs(t[3], pe);
};
GEN['var'] = function (t, pe) {
    return 'var ' + t[1] + '=' + toSrcJs(t[2]||'null', pe);
};
GEN['function'] = function (t, pe) {
    return 'function ' + t[1] + '(' + toArrays(t[2], pe).join(',') + ') ' + ensure_block(Array.prototype.slice.call(t, 3).map(function (tp) { return toSrcJs(tp, pe); })) + '\n';
};
GEN['lambda'] = function (t, pe) {
    return 'function (' + toArrays(t[1], pe).join(',') + ') {' + toSrcJs(t[2], pe) + '}';
};
GEN['if'] = function (t, pe) {
    var p3 = t[3];
    return 'if (' + toSrcJs(t[1], pe) + ') {\n' + toSrcJs(t[2], pe) + (p3 ? '\n} else {\n  ' + toSrcJs(p3, pe) : '') + '\n}\n';
};
GEN['?:'] = function (t, pe) {
    var p3 = t[3];
    return '(' + toSrcJs(t[1], pe) + ' ? ' + toSrcJs(t[2], pe) + ' : ' + (p3 ? toSrcJs(p3, pe) : 'null') + ')';
};
GEN['while'] = function (t, pe) {
    return 'while (' + toSrcJs(t[1], pe) + ')' + toSrcJs(t[2], pe);
};
GEN['block'] = function (t, pe) {
		var b= Array.prototype.slice.call(t, 1).map(function (tp) {
				var st= toSrcJs(tp, pe);
        return ((st==null||st==""||!st.match) ? "" : (st+(st.match(/(\*\/|\}|\{)[\s\r\n]*$/) ? "\n" : ";\n")));
    }).join('');
    return ensure_block(b);
};
GEN['get'] = function (t, pe) {
    return toSrcJs(t[1], pe) + '[' + toSrcJs(t[2], pe) + ']';
};
GEN['set'] = function (t, pe) {
    return "(" +toSrcJs(t[1], pe) + '[' + toSrcJs(t[2], pe) + ']= ' + toSrcJs(t[3], pe)+")";
};
GEN['`'] = function (t, pe) {
    var sa = toArrays(t[1], pe);
    var sq = qq(sa);
    logm('DBG', LangLogLvl, 'QQ', {
        'SA': sa,
        'SQ': sq
    });
    return toSrcJs(sq, pe);
};
GEN['kv'] = function (t, pe) {
    var i = 0;
    return '{' + Array.prototype.slice.call(t, 1).map(function (tp) {
        i = i + 1;
        return i % 2 ? (tp.match(/\$(STR)\$(\d+)\$/) ? toSrcJs(tp, pe) : ser_json(tp)) + ': ' : toSrcJs(tp, pe) + ', ';
    }).join('') + '}';
};
GEN['array'] = function (t, pe) {
    return '[' + Array.prototype.slice.call(t, 1).map(function (tp) {
        return toSrcJs(tp, pe);
    }).join(', ') + ']';
};
GEN['concat'] = function (t, pe) {
    return '(' + toSrcJs(t[1], pe) + '||[]).concat(' + toSrcJs(t[2], pe) + '||[])';
};
GEN['slice'] = function (t, pe) {
    return '(' + toSrcJs(t[1], pe) + ').slice(' + toSrcJs(t[2], pe) + (t[3] ? ', '+toSrcJs(t[3], pe) : '')+')';
};
GEN['.'] = function (t, pe) {
    return '(' + toSrcJs(t[2], pe) + ').' + t[1] + '(' + Array.prototype.slice.call(t, 3).map(function (tp) {
        return toSrcJs(tp, pe);
    }) + ')';
};
toSrcJs= function (t, pe, gen) {
    logm('DBG', LangLogLvl, 'toSrcJs', {
        'type': typeof t,
        't': t
    });
    var r = '';
    if (null == t)
        return '';
    if (t != null && typeof t == 'object' && !Array.isArray(t))
        return toSrcJs(t.main, t, gen);
    else {
        gen = gen || GEN;
        if (Array.isArray(t)) {
            var h = t[0];
            var fgen = gen[h];
            logm('DBG', LangLogLvl, 'toSrcJs ARR h', {
                'HEAD': h,
                'FGEN': typeof fgen
            });
            if (fgen)
                return fgen(t, pe);
            else {
                var m = (""+h).match(/^[^a-z0-9]+$/i);
                if (m)
                    r = '(' + Array.prototype.slice.call(t, 1).map(function (tp) {
                        return toSrcJs(tp, pe);
                    }).join(h) + ')';
                else
                    r = h + '(' + Array.prototype.slice.call(t, 1).map(function (tp) {
                        return toSrcJs(tp, pe);
                    }).join(', ') + ')';
            }
        } else {
            var m = t != null && (t+"").match(/\$(EXP|STR)\$(\d+)\$/);
            r = m ? m[1] == 'EXP' ? toSrcJs(pe.exp[m[2]], pe) : ser_json(pe.str[m[2]]) : t;
        }
        logm('DBG', LangLogLvl, 'toSrcJs R', {
            'js': r,
            't': t
        });
        return r;
    }
};
visit = function (xfrm, t, pe) {
    logm('DBG', LangLogLvl, 'visit', t);
    if (t != null && typeof t == 'object' && !Array.isArray(t))
        return visit(xfrm, t.main, t);
    else if (Array.isArray(t))
        return xfrm(t, pe, xfrm);
    else {
        var m = t.match(/\$(EXP|STR)\$(\d+)\$/);
        return m ? m[1] == 'EXP' ? xfrm(pe.exp[m[2]], pe, xfrm) : xfrm(ser_json(pe.str[m[2]]), pe, xfrm) : xfrm(t, pe, xfrm);
    }
};
get_file_arrays= function (path) {
    return toArrays(parse(get_file(path)));
};
parse_rtl_toSrc_js= function (src,srcUrl) {
		srcUrl= srcUrl||"toSrc_js";
    return ('//# sourceURL=' + srcUrl + '\n' + toSrcJs(parse(src)));
};
eval_rtl= function (src,srcUrl) {	
	return(MiEval(parse_rtl_toSrc_js(src,srcUrl)));
}

load_js= function (path) {
    return parse_rtl_toSrc_js(get_file(path),path);
};

load_l= function (path) {
	try {	
		var js= load_js(path);
    return MiEval(js,path,ARGV);
	}
	catch (ex) { set_file(path.replace(/([^\/]+)$/,"x_dump_$1"),js); throw(ex);}
};
