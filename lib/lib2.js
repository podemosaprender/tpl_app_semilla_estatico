fnop= nullf= function(){}; //U: un callback que no hace nada
idf= function (x) { return x; };
zerof= function (){ return 0; } //U: una funcion que siempre devuelve cero
evalm= this.evalm || function (src) { return eval(src); }
ensure_var= function (k,v,scope) { //D: ensure k exists in scope initializing with "v" if it didn't
	scope= scope || GLOBAL;
	if (!(k in scope)) { scope[k]= v; } return scope[k];
}
ensureInit= ensure_var; //DEPRECATED: deprecamos el nombre VIEJO, dejamos este alias hasta que lo eliminemos

ensure_var("CfgMaxRecursiveCallCnt",1,GLOBAL);

ensure_var("LibRt",{},GLOBAL); //A: en general la define el runtime, pero sino con esto alcanza
if (! LibRt.jsEval) { LibRt.jsEval= function (src, dsc, args) { return evalm(src); } };

//*****************************************************************************
//S: comunes
ahora= function () { return new Date(); }
timestamp= function (aDate) { aDate= aDate || ahora(); return aDate.toJSON().replace(/[^a-z0-9]*/gi,"").substr(0,15); }
dateParts= function (pfx,aDate,dst) { aDate= aDate || ahora(); return zipkv("YMDhmsf ".split(""),aDate.toJSON().split(/[^0-9]+/),dst,pfx); }

tpl_apply_kv= function (tpl,kv,markL,markR,chars) { 
	markL= markL||"{{"; markR= markR||"}}"; chars= chars||"a-zA-Z0-9_.";
	return tpl.replace(new RegExp(markL+"(["+chars+"]+?)"+markR,"g"),function (x,k) { return kv[k]; });
}


//*****************************************************************************
//S: log
logmAndThrow= function (t,lvl,msg,o) {
	logm(t,lvl,msg,o);
	throw(ser({message: msg, data: o}));
}

logmex= function(t,lvl,msg,o,ex) {
	logm(t,lvl,msg+" EXCEPTION "+exceptionToString(ex),o);
}

exceptionToString= function (ex) {
    var es= "no hay info de error";
		if (ex!=null) {
			es= (typeof(ex)=="string" && ex) || (ex.message && (ex.message + (ex.data ? (" "+ser_json(ex.data)) : "")) || ((typeof(ex.getMessage)=="function") && ex.getMessage())|| "").replace(/\r?\n/g," ");
			if (ex.stack) { es+= " "+ex.stack.replace(/\r?\n/g," > ");}
			else {
					if (ex.fileName) { es+= " "+ex.fileName;}
					if (ex.lineNumber) { es+= ":"+ex.lineNuber;}
			}
		}
    return es;
}

fArgsCopy= function(a,idxMin,dst) { //U: copiar "arguments" a un array, USAR esta separada en una linea asi la podemos reemplazar por una macro porque v8 NO optimiza las funciones que hacen cosas raras con arguments :P
	var r= Array.prototype.slice.call(a,idxMin||0);
	return dst ? dst.concat(r) : r;
}

//******************************************************************************
//S: algoritmos/kv
set_kPathV= function (kv,kPath,v,idx_) { //U: [a,b,c] -> { a: { b: { c: v } } }, crea lo que sea necesario
	kv= kv || {}; idx_= idx_||0;
	var k0= kPath[idx_]; //A: el proximo elemento del path	
	kv[k0]= kPath.length>(idx_+1) ? set_kPathV(kv[k0],kPath,v,idx_+1) : v;
	return kv;
}

ensure_kPath= function (kv,kPath,idx_) { //U: [a,b,c] -> { a: { b: { c: {} } } }, crea lo que sea necesario pero no pisa lo que existe
	kv= kv || {}; idx_= idx_||0;
	var k0= kPath[idx_]; //A: el proximo elemento del path
	kv[k0]= kv[k0]||{};
	return kPath.length>(idx_+1) ? ensure_kPath(kv[k0],kPath,idx_+1) : kv[k0] ;
}


P_SEP_RE= /([^A-Za-z0-9_\.+\$-])/;
parse_p= function (p, sepRe) { return p.split(sepRe || P_SEP_RE).slice(1); }
get_p_impl= function (dst,p,wantsCreate,max,sepRe) { //U: trae un valor en un "path" de kv/arrays anidados
  var parts= Array.isArray(p) ? p : parse_p(p,sepRe);
	if (parts.length && parts[parts.length-1]=="") { parts.pop(); }
	//A: p empieza con un separador 
	dst= dst!=null ? dst : wantsCreate ? (parts[0]=="[" ? [] : {} ) : null;
	max= max||0;
	var dstp= dst;
  for (var i=1; dstp!=null && i<parts.length-max; i+=2)  { var k= parts[i]; var t= parts[i+1]; 
    //DBG logm("DBG",1,"LIB set_p",{k: k, t: t, i: i, dstp: dstp});
		var x= dstp[k];
		if (x==null && wantsCreate && i<parts.length-1) { x= dstp[k]= (t=="[" ? [] : {} ); }
		dstp= x; 
  }
	//A: dstp tiene el objeto donde hay que poner el valor
  //DBG logm("DBG",1,"LIB set_p",{p: p, dstp: dstp});
	return [dstp,dst];
}

get_p= function (dst,p,wantsCreate,sepRe) { //U: trae un valor en un "path" de kv/arrays anidados
	return get_p_impl(dst,p,wantsCreate,null,sepRe)[0];
}

set_p= function (dst,p,v,wantsIfNotSet,sepRe) { //U: pone un valor en un "path" de kv/arrays anidados
  var parts= Array.isArray(p) ? p : parse_p(p,sepRe);
	//A: p empieza con un separador => parts[0] se ignora, parts[i] es tipo, parts[i+1] clave
	var dd= get_p_impl(dst,p,1,1,sepRe);	
	var dstp= dd[0];
  //DBG logm("DBG",1,"LIB set_p",{p: p, dstp: dstp});
	try {
		var k= parts[parts.length-1];
 	 	if (wantsIfNotSet && dstp[k]!=null) { }
 	 	else { if (k=="+") {dstp.push(v)} else if (k=="-") {dstp.unshift(v)} else { dstp[k]= v; } }
	} catch (ex) { logmex("ERR",1,"set_p",{dst: dst,p:p,parts:parts,dstp: dstp},ex) }

	return dd[1];
}

set_p_all= function (dst,kv) { dst= dst || {}; //U: kv= path->v
	fold(kv,function (v,k) { set_p(dst,k,v); }); 
	return dst;
}

isEmpty_kv= function (obj) { //U: verdadero si un KV es nulo o esta vacio
    if(obj!=null){ return Object.keys(obj).length === 0; }
		else{ return true;}
}


get_kv= function (kv,k,dflt) { return (kv!=null && typeof(kv)=="object" && (k in kv)) ? kv[k] : dflt; } //U: como o[k] PERO no devuelve dflt si o es null, o no tiene k, o no es un objeto o...

keys_kv= function (kv) { return Object.keys(kv); }; //U: devuelve las claves para un objeto

length_kv= function (kv) { return keys_kv(kv).length; }; //U: cuantas claves tiene un kv

//******************************************************************************
//S: algoritmos/componer funciones
fCb= fCbAlert= function (msj,tipo,cbDespues) { return function () { alert((tipo||"")+": "+msj); if (cbDespues) { cbDespues.apply(this,arguments) } } }	

fVarArgs= function (idx,f) { return function () { var args= fArgsCopy(arguments); args[idx]= args.splice(idx); return f.apply(this,args); } }; //U: devuelve una funcion que llama a f con los idx primeros argumentos y el resto en un array

fRunDelayO= fVarArgs(3,function (dt,that,f,args) { return setTimeout(function() { f.apply(that,args); },dt); }); //U: una forma mas copada de decir que una funcion se pude ejecutar en unos milisegundos
fRunDelay= fVarArgs(2,function (dt,f,args) { return setTimeout(function() { f.apply(this,args); },dt); }); //U: una forma mas copada de decir que una funcion se pude ejecutar en unos milisegundos

for (var i=0;i<10;i++) { GLOBAL["fArg_"+i]={"fArg_":i} };
fArg_here= {"fArg_": "here"}
fArg_array= {"fArg_": "argsArray"}
//U: hay variables para poder escribir fArg_1 o fArg_array en funciones que manipulan argumentos

fBindO= fVarArgs(2,function (that,f,idxAndVals) {  //U: devuelve una funcion que puede tener fijos algunos argumentos y cambiar de orden otros, ej. si definis miFunB= fBind(miFunX,"constante",fArg_2,unaVarLocal,fArg_array,fArg_1,fArg_here) y llamas miFunB("a","b","c","d") es lo mismo que miFunX("constante","c",unaVarLocal,["a","b","c","d"],"b","a","b","c","d"); Las variables que pasas a fBind quedan capturadas en la funcion definida.
		return function () { 
			var args= []; 
			for (var i=0; i<idxAndVals.length;i++) { var x= idxAndVals[i];
				var idx= get_kv(x,"fArg_");
				if (idx=="here") { args= fArgsCopy(arguments,0,args); }
				else { args.push(idx=="argsArray" ? fArgsCopy(arguments) : idx!=null ? arguments[idx] : x); }
			}; 
			return f.apply(that,args);
		};
});

fBind= fBindO(this,fBindO,this,fArg_here);

fLog= function(f,l,m) { //U: envuelve una funcion en otra que loguea los parametros y el resutado
	return fVarArgs(0,function (a) { 
		logm("DBG",l||9,m||"FUNCION",a); 
		var r= f.apply(this,a); 
		logm("DBG",l,(m||"FUNCION")+" R",{r: r, a:a}); 
		return r; 
	}) 
}

fLogAsync= function(f,l,m) { //U: envuelve una funcion en otra que loguea los parametros y el resutado
	return fVarArgs(0,function (a) { 
		logm("DBG",l||9,m||"FUNCION",a); 
		var cbOri= a[a.length-1];
		var cb= fLog(cbOri,l,(m||"FUNCION")+" CB");
		a[a.length-1]=cb;
		var r= f.apply(this,a); 
		logm("DBG",l,(m||"FUNCION")+" R",{r: r, a:a}); 
		return r; 
	}) 
}


fLimit= function(f,queue,availableCounter,pollDelay,fname) {  //U: pone un limite de ejecuciones simultaneas de una funcion ASYNCRONA, ej. para no saturar la conexion http de pedidos que despues abandonamos
		var sts= {availCnt: availableCounter||{}, q: queue || [], pollHandle: null, delay: pollDelay||-1}; //U: delay -1 no pollea
		sts.availCnt.max= sts.availCnt.max || 1;
		sts.availCnt.val= sts.availCnt.val || sts.availCnt.max;

		var flw= function (sts,args) { sts.availCnt.val--;
			logm("DBG",7,"Q CALLING",{f: fname,len: sts.q.length, availCnt: sts.availCnt.val, args: args});
			var cb= args.pop();
			args.push(fVarArgs(0,function(rargs) { 
				sts.availCnt.val=Math.min(sts.availCnt.val+1,sts.availCnt.max); //A: nunca contamos mas disponibles que el maximo
				logm("DBG",7,"Q CALLING CB",{f: fname,len: sts.q.length, availCnt: sts.availCnt.val, args: args, rargs: rargs});
				cb.apply(null,rargs); 
				fRunDelay(5,fpoll,sts);
			}));
			f.apply(null,args); 
		}

		var fpoll= function (sts) { 
			logm("DBG",7,"Q WAIT POLLING",{f: fname,len: sts.q.length, availCnt: sts.availCnt.val});
			while (sts.q.length>0 && sts.availCnt.val>0)  { flw(sts,sts.q.shift()); } 
			if (sts.q.length) {
				if (sts.delay>0) {
					logm("DBG",7,"Q WAIT POLLING DONE RESCHEDULING",{f: fname,len: sts.q.length, availCnt: sts.availCnt.val}); 
					clearTimeout(sts.pollHandle); 
				 	sts.pollHandle= fRunDelay(sts.delay,fpoll,sts); 
				}
			}
			else {
				logm("DBG",7,"Q WAIT POLLING DONE",{f: fname,len: sts.q.length, availCnt: sts.availCnt.val}); 
			}
		}

		var fl= fVarArgs(0,function(args) { 
			if (sts.availCnt.val>0 && sts.q.length==0) {  flw(sts,args); }
			else { 
				sts.q.push(args); 
				if (sts.delay>0) { 
					if (!sts.pollHandle) { logm("DBG",7,"Q WAIT SCHEDULING POLL",{f: fname,len: sts.q.length,args: args});
						sts.pollHandle= fRunDelay(sts.delay,fpoll,sts); 
					}
					else { logm("DBG",7,"Q WAIT POLL SCHEDULED",{f: fname,len: sts.q.length, args: args}); }
				}
			}
		});
		fl.sts= sts;
		fl.poll= fpoll;
		fl.f= f;
		fl.reset= function () {
			logm("DBG",5,"Q RESET",{f:fname});
			sts.q.splice(0); //A: borramos los pendientes
			sts.availCnt.val = sts.availCnt.max; //A: habilitamos nuevas llamadas
		}
		return fl;
}

//****************************************************************************
//S: flujo gen
parse_flujo= function (s) {try{ var r= {}; s.split(/\s*,[\r\n\s]*/).map(function (l) { var a=l.split(/:\s*|\s+/); r[a[0]]= a.slice(1); }); return r;}catch(ex){logmex("ERR",1,"FLUJO DEFINE",{s:s,r:r},ex)}}

parse_flujo_dep= function (a) { return ( //U: devuelve si una dep es externa o no
				a.match(/^((\d+(\.\d+)?)|true|false|null|fArg_(here|array|\d))$/) ? [a] : 
				(a[0]=="\"") ? [a] : 
				(a[0]=="*") ? [a.substr(1)] :
				(a=="flujo_sts") ? ["sts"] :
				(a=="flujo_cb") ? ["cbDespues"] :
				["sts.",a] ); };

FLUJO_ESPERANDO= {FLUJO_ESPERANDO:1};
flujo_src_= function (flujo,pfx) {
	pfx= pfx || "";
	var s="";
	s+= "ensure_var(\""+pfx+"LogLvl\",8);"; 
	s+=pfx+"FlujoGetReturn_run_a= function(sts,cb) { sts.FlujoGetCb(sts); }\n";
	s+=pfx+"FlujoGetReturn_necesita= function(sts) { var r={}; sts.FlujoGetVars.map(function (k) { if (k in sts) {} else { r[k]= 'pedir' } }); return r; }\n";
	for (k in flujo) { var como= flujo[k];
		var fn= como[0];
		if (fn) {
			var esAsync= fn.match(/_a$/);
			var args= como.slice(1);
			var argsSts= args.map(function (a) {return parse_flujo_dep(a).join("")});

			var argsNoGlobal= [];
			argsSts.map(function (a) { var m; if (m= a.match(/^sts\.(.*)/)) {argsNoGlobal.push(m[1])} });

			var cbd= "var cbDespues= function (r) { sts."+k+"= r; logm('DBG',"+pfx+"LogLvl,'FLUJO RUN CB',{que: '"+k+"', rNotNull: r!=null, r: (sts.DBG_DATA ? r : '')}); cb(sts); };"
			var call= fn+".apply({err: function(msg) { sts.err.push(msg); }, sts: sts},["+(esAsync ? argsSts.concat("cbDespues"): argsSts).join(",")+"]);"
			var exp= esAsync ? (cbd+" "+call) : ("sts."+k+"= "+call+" cb(sts)");
			s+=pfx+k+"_run_a= function(sts,cb) { if ('"+k+"' in sts) { } else { sts['"+k+"']= FLUJO_ESPERANDO; "+exp+"} }\n";
			s+=pfx+k+"_necesita= function(sts) { var r={}; "+ (argsNoGlobal.length ? "if (('"+k+"' in sts && sts['"+k+"']!=FLUJO_ESPERANDO)) { } else { "+ser_json(argsNoGlobal)+".map(function (k) { if ((k in sts) && (sts[k]!=FLUJO_ESPERANDO)) {} else { r[k]= 'pedir' } }) };" : "") +" return r; }\n";
		}
	}
	logm("DBG",3,"FLUJO SRC",{flujo: flujo, src: s});
	return s;
}

//*****************************************************************************
//S: flujo, supervisor
flujo_run_a_= function (flujo,que,sts,cb) { //U: revisa que falta para ejecutar "que" y si no falta nada, la ejecuta
	var f= flujo[que+"_necesita"]; 
	if (f) {//A: f tiene la funcion que lista las dependencias para conseguir "que"
		var n1= f(sts);
		if (Object.keys(n1).length) { //A: para conseguir "que" faltan parametros
			logm("DBG",flujo.LogLvl,"flujo_run_a_ FALTAN",{que: que, faltan: n1});
		}
		else { //A: tenemos todo lo que necesitamos
			logm("DBG",flujo.LogLvl,"flujo_run_a_ EJECUTANDO",{que: que});
			flujo[que+"_run_a"](sts,cb);
		}
	}
	else {
		logm("ERR",1,"flujo_run_a_ NO ENCUENTRO como",{que: que});
	}
}

flujo_llego_= function(flujo,sts,que,valor,cb) { //U: cuando llega "que" que esperabamos, le avisamos a todos los obesrvers (ej. otras funciones que lo necesitan como parametro)
	if (sts.PROCESS_ABORT) { return ; } //A: si pidieron que paremos, no hacemos nada mas

	var w= sts.FlujoPedidos_[que]; delete(sts.FlujoPedidos_[que]); //A: llego, lo sacamos de la lista de esperados
	var k; for (k in w) { (function(k) {
		var cb= w[k];
		logm("DBG",flujo.LogLvl,"FLUJO LLEGO AVISANDO",{que:que,observador:k,cbIsNull: cb+"", cb: cb});
			
		if (flujo[k+"_run_a"]) { //A: sigue el flujo
			flujo_run_a_(flujo,k,sts,function (sts) { flujo_llego_(flujo,sts,k,sts[k],cb); });
		}
		else { //A: era un pedido de flujo_a
			cb(sts);
		}
	})(k)}
	//A: llamamos la funcion async para cada uno que esperaba, que decida ella si tiene todo y sigue o sino que hace
}

flujo_pedir_= function (flujo,sts,queKv,que,cb) { //U: para k en queKv, lo anotamos en la cola de pedidos y anotamos que cuando llegue se puede ejecutar "que"
	if (sts.PROCESS_ABORT) { return ; } //A: si pidieron que paremos, no hacemos nada mas

	logm("DBG",flujo.LogLvl,"FLUJO PEDIR",{queKv: Object.keys(queKv), pedidos: sts.FlujoPedidos_, nuevos: sts.FlujoPedidosQ_});
	sts.FlujoPedidos_=	sts.FlujoPedidos_||{};
	sts.FlujoPedidosQ_=	sts.FlujoPedidosQ_||[];
	var k;
	for (k in queKv) {
		var w= sts.FlujoPedidos_[k]; //A: los que esperan k	
		if (!w) { sts.FlujoPedidosQ_.push(k); w= sts.FlujoPedidos_[k]= {}; }
		//A: los que esperan k seguro incluye este pedido
		if (!w[que]) { w[que]= cb || nullf; } //A: nos anotamos como "observer"
	}	
	logm("DBG",flujo.LogLvl,"FLUJO PEDIDOS",{pedidos: sts.FlujoPedidos_, nuevos: sts.FlujoPedidosQ_});
}

flujo_poll_= function (flujo,sts) { //U: recorre la cola de pedidos pendientes y prueba conseguir cada uno, que o habran puesto su valor en el estado o habran disparado otros pedidos en FlujoPedidosQ_
	if (sts.PROCESS_ABORT) { return ; } //A: si pidieron que paremos, no hacemos nada mas

	var pp= sts.FlujoPedidosQ_; sts.FlujoPedidosQ_= []; var p; //A: copiamos FlujoPedidosQ_ porque las funciones vamos a llamar la modifican
	while (p= pp.pop()) {(function (p) { //A: tratamos de conseguir cada pendiente
			flujo_run_a_(flujo,p,sts,function(sts) { flujo_llego_(flujo,sts,p,sts[p]) });
	})(p)};
}

flujo_deps_= function (flujo,que,sts,cb) { //U: pide todo necesario para ejecutar "que", incluyendo las dependencias de sus dependencias
	if (sts.PROCESS_ABORT) { return ; } //A: si pidieron que paremos, no hacemos nada mas

	var f= flujo[que+"_necesita"];
	if (f) {//A: f tiene la funcion que lista las dependencias para conseguir "que"
		var n1= f(sts);
		if (Object.keys(n1).length) { //A: faltan cosas
			flujo_pedir_(flujo,sts,n1,que,cb); //A: pedimos las dependencias de "que"	
			for (k in n1) { flujo_deps_(flujo,k,sts) } //A: pedimos las dependencias de las dependencias
		}
	}
	else {
		logm("ERR",1,"FLUJO NO SE COMO CONSEGUIR",{que: que, flujo: flujo, sts: sts});
	}
}

//*****************************************************************************
//S: flujo, definir y usar
flujo_a= function (flujo,que,sts,cb) {//U: consigue "que" ejecutando la definicion de "flujo" con estado "sts"
	var que_parsed= parse_flujo_dep(que);
	logm("DBG",flujo.LogLvl,"FLUJO_A",{que: que, que_parsed: que_parsed, cb: cb!=null, sts: sts});
	var miCb= function (sts) { (typeof(cb)=="function") && cb(sts[que],sts) };
	if (que_parsed[0]=="sts.") { //A: es una var del flujo
		if (que in sts) { miCb(sts); } //A: ya lo tengo!
		else {
			flujo_deps_(flujo,que,sts,cb); //A: pedimos todas las dependencias para ejecutar "que"
			var queKv= {}; queKv[que]="pedir";
			flujo_pedir_(flujo,sts,queKv,que+"_return_a_flujo_a",miCb);
			flujo_poll_(flujo,sts);
		}
	}
	else { //A: es una constante o ref global
		var dbDespues= cb;	
		var x= evalm(que_parsed[0]);
		cb(x,sts);
	}
}

flujo_define_src= function (id,src,dst) { //U: genera los fuentes para un flujo
	var Xdef= typeof(src)=="string" ? parse_flujo(src) : src;
	var srcGen= id+"={}; "+flujo_src_(Xdef,id+".");
	return srcGen;
}

flujo_define= function (id,src,dst) { //U: parsea una definicion y define el flujo en la variable "id" de dst o GLOBAL
	var srcGen= flujo_define_src(id,src,dst);
	evalm(srcGen);//XXX: encapsular!
}

flujo_function_src= function (flujoId,nombreYargsComoStr) {try{ //U: ej. flujo_function("mapTile_flujo","mapTile_a aTile cb") define la funcion "mapTile_a(aTile,cb)" que invoca flujo a con ese flujo, mapTile_a como objetivo y {aTile: aTile, cb: cb} como estado ASI de un solo flujo se pueden fabricar muchas funciones
	var argNames= nombreYargsComoStr.split(/\s+/);
	var fName= argNames.shift();
	var src= fName+"= function ("+argNames.join(",")+") { var sts={err: [], "+argNames.map(function (k) { return k+":"+k }).join(",")+"}; flujo_a("+flujoId+",'"+fName+"',sts)};";
	return src;
}catch(ex){logmex("ERR",1,"FLUJO FUNCTION SRC",{flujoId: flujoId,nombreYargsComoStr:nombreYargsComoStr})}}

flujo_function= function (flujoId,nombreYargsComoStr) { //U: ej. flujo_function("mapTile_flujo","mapTile_a aTile cb") define la funcion "mapTile_a(aTile,cb)" que invoca flujo a con ese flujo, mapTile_a como objetivo y {aTile: aTile, cb: cb} como estado ASI de un solo flujo se pueden fabricar muchas funciones
	var src= flujo_function_src(flujoId,nombreYargsComoStr);
	evalm(src);
}


//*****************************************************************************
//S: serializacion
ser_json= function (o,wantsPretty) {
	var s;
	if (o!=null) {
		try { s= JSON.stringify(o,null,wantsPretty ? 2 : null); }
		catch (ex) { s=new String(o); }
	}
	else {
		s="null";
	}
	return s;
}

ser_json_r= function (s) {
	try { return JSON.parse(s); }
	catch (ex) { logmex("ERR",5,"SER PARSE JSON",s,ex); throw(ex); }
}

ser= ser_json; //DFLT

ser_planoOproto= function (ox,serFun,wantsPretty) { //U: para NO encodear strings, usa el primer caracter para distinguir
	var o= toJs(ox)
	return ((typeof(o)=="string") ? ("\t"+o) : (" "+serFun(o,wantsPretty)));
}

ser_planoOproto_r= function (s,serFun_r) {
	return (s && s.length>0) ? 
		s.charAt(0)=="\t" ? s.substr(1) : serFun_r(s.substr(1)) :
		null;
}

ser_planoOjson= function (o, wantsPretty) { return ser_planoOproto(o,ser_json,wantsPretty); }
ser_planoOjson_r= function (s) { return ser_planoOproto_r(s,ser_json_r); }

escape_html= function (str) { //U: encodea todos los carateres peligrosos en html para que no se rompa lo que se ve
  return str!=null ? (str+"").replace(/[^A-Za-z0-9-_]/g,function (chr) { return "&#"+chr.charCodeAt(0)+";" }) : "";
}

escape_uri= function (str) { //U: encodea todos los carateres peligrosos en uri component para que no se rompa
  return str!=null ? (str+"").replace(/[^A-Za-z0-9-_]/g,function (chr) { return "%"+chr.charCodeAt(0).toString(16) }) : "";
}

ser_kv_txt_r= function (s,re) { //U: clave valor como texto a kv
	re= re || /(\S+)([ \t]+(.*))/gm;
	var r= {};
	take_stream(nuevo_stream_regex(re,s),null,{push: function (e) { r[e[1]]= e[3]+"" }});
	return r;
}

//*****************************************************************************
//S: algoritmos / funciones utiles
truncate= function (num,decs) { var x= Math.pow(10,decs); return Math.floor(num*x)/x; }
promedio= function (v0,v1) { return v0+(v1-v0)/2; }
clonar= function (o,ext,dst) { var r= dst || ((!o ||Array.isArray(o)) && (!ext || Array.isArray(ext))) ? [] : {}; for (var k in o) { r[k]= o[k] }; for (var k in ext) { r[k]= ext[k] }; return r; }

PJ= cbMostrarResultado= function() { //U: callback generico que muestra el resultado y lo guarda en la variable global x
	var r= fArgsCopy(arguments);
  if (console && console.log) { console.log(ser_json(r,true)); }
	else if (print) { print(ser_json(r,true));}
	else { logm("DBG",1,"RESULTADO",r); }
  x = r;
}

//*****************************************************************************
//S: algoritmos / hashes
hash_string= function (s) { //U: devuelve un hash "bastante" UNICO para un string
	var bitArray = sjcl.hash.sha256.hash(s);  
	var digest_sha256 = sjcl.codec.base64.fromBits(bitArray); 
	return digest_sha256;
}

hash= function (o) { //U: devuelve un hash "bastante" UNICO para cualquier objeto
	return hash_string(ser_json(o));
}

//*****************************************************************************
//S: algoritmos / ofuscar XOR (SOLO usar para que no vea usuario, es MUY facil de crackear)
ofuscar_xor_string= function (data,key) {
  return data.split("").map(function(c, i) {
    return String.fromCharCode(c.charCodeAt(0) ^  key.charCodeAt( Math.floor(i % key.length) ));
  }).join("");
}

ofuscar_url= function (url,key) {
	key= key || "UnAClaBeQU3m3Inv3t4q2YQu3N0M3l44d1v1n2nadi3s"
	return url.split("/").map(function(p) { return seguro_fname(enc_base64(ofuscar_xor_string(p,key)).replace(/\//g,"_").replace(/\+/g,"-").replace(/=/g,"")); }).join("/");
}

//*****************************************************************************
//S: algoritmos / strings
mk_str= function(len,s) { s=s || " "; var r= s.length<len ? Array(Math.ceil(len/s.length)+1).join(s) : s; return r.substr(0,len); } //U: un string de largo len repitiendo s

padl= function (fill,v,len) { v=(v==null ? "":v)+""; fill= mk_str(len||fill.length,fill); return (fill.substr(0,fill.length-v.length)+v)  } //U: agrega v a la derecha de fill, ej padl("ABCDEFGHI",12) -> ABCDEFG12

padr= function (fill,v,len) { v=(v==null ? "":v)+""; fill= mk_str(len||fill.length,fill); return (v+fill.substr(0,fill.length-v.length))  } //U: agrega v a la izquierda de fill, ej padr("ABCDEFGHI",12) -> 12ABCDEFG

trim= function (s,trimChars) { return s.replace(new RegExp("^["+(trimChars||" \t\r\n")+"]*","g"),'').replace(new RegExp("["+(trimChars||" \t\r\n")+"]*$","g"),''); }

splitForCapitalLetters= function (string) {
  if (string.length) { string = string.split(/(?=[A-Z])/); }
  return string;
}

String.prototype.splitForCapitalLetters= function () { return splitForCapitalLetters[this]; }

length_str_bytes= function (str) {//U: returns the byte length of an utf8 string
  var s = str.length;
  for (var i=str.length-1; i>=0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s+=2;
    if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
  }
  return s;
}
 
hashDir_num= function (n) { //U: para asegurar que ningun dir tiene demasiadas entradas y traba el ls, separa el numero "n" en un dir cada un par de digitos y agrega la cantidad de digitos como prefijo de modo que al listarlos sigan ordenados, ej. n=12345 -> 06/01/23/012345 ; n=912345 -> 06/91/23/45/912345
	var s= n+"";
	var snorm= (s.length % 2 ? "0" : "") + s;
	var sparts= snorm.match(/(..)/g);
	sparts.unshift(padl("0",snorm.length,2));
	sparts.pop();
	sparts.push(snorm);
	var fn= sparts.join("/");
	return fn;
}
//*****************************************************************************
//S: algoritmos / numeros y azar
random_int= function (max) { return Math.floor(Math.random()*(max||10)); } //U: un entero al azar entre 0 y max

parse_number= function (v,dflt) {
	var xf= parse_float(v,dflt);
	if (typeof(xf)=="number") { var xi= Math.floor(xf); if (xi==xf) { return xf; } }
	return xf;
}

parse_float= function (v,dflt) {
	var x= parseFloat(v); //A: si podemos lo convertimos a numero
	return (!isNaN(x) && ((x+"")==v || (x+"")==("0"+v))) ? x : dflt; //A: lo pudimos convertir y NO cambio (sino se rompe ej. 002 como prefijo, que se convierte incorrectamente en 2)
}

//*****************************************************************************
//S: algoritmos / ordenar listas y claves
ordenadaPorPropiedadNumerica= function (lista,propiedad) {
	return lista.sort(function (a,b) { return a[propiedad]-b[propiedad]; })
}

clavesOrdenadasPorPropiedadNumerica= function (kv,propiedad) {
	return Object.keys(kv).sort(function (a,b) { return kv[a][propiedad]-kv[b][propiedad]; })
}


//*****************************************************************************
//S: algoritmos / comparar
cmp= function (a,b) { return (a||" ")==(b||" ") ? 0 : (a||" ") > (b||" ") ? 1 : -1 }; //U: se puede pasar como parametro a sort para ordenar numeros o strings

diff= function(v1, v2, quiereCompararMetodos, clavesParaIgnorar,pfx, err) { //U: compara dos valores cuales quiera y devuelve null si son iguales o un array de diferencias
    pfx= pfx || "";
    err= err || [];
    var t1= typeof(v1);
    var t2= typeof(v2);
    if (t1!=t2) {
        if ((v1!=null && t1!="undefined" && v2!=null && t2!="undefined") && ((t1!="function" && t2!="function") || quiereCompararMetodos)) { //A: ninguno es metodo O hay al menos un valor O quiere comprar metodos
            err.push([pfx,"los tipos difieren",t1,t2,v1,v2])
        }
    }
    else if (typeof(v1)=="object" && v1 && v2) {
        for (var k in v1) {
						if (k && (!clavesParaIgnorar || clavesParaIgnorar.indexOf(k)==-1)) {
	            diff(v1[k],v2[k],quiereCompararMetodos,clavesParaIgnorar,pfx+"/"+k,err)
						}
        }
        for (var k in v2) {
					if (k && (!clavesParaIgnorar || clavesParaIgnorar.indexOf(k)==-1)) {
            if(!v1[k] && v2[k]){ err.push([pfx, "la clave no existe en el primer objeto",k]); }
					}
        }
    }
    else {
        if (v1+""!=v2+"") {
            if ((t1!="function" && t2!="function") || (v1!=null && v2!=null) || quiereCompararMetodos) { //A: ninguno es metodo O quiere comprar metodos
                err.push([pfx,"los valores difieren",v1,v2]);
            }
        }
    }
    return err.length ? err : null;
}

fCmpAttr= function (k) { return function(ao,bo) { var a= ao[k], b= bo[k]; return (a||" ")==(b||" ") ? 0 : (a||" ") > (b||" ") ? 1 : -1 }; } //U: crea una funcion para comparar un atrbuto de ambos objetos, para pasarle a sort
fCmpValue_kv= function (kv) { return function(ak,bk) { var a= kv[ak], b= kv[bk]; return (a||" ")==(b||" ") ? 0 : (a||" ") > (b||" ") ? 1 : -1 }; } //U: crea una funcion para comparar un atrbuto de ambos objetos, para pasarle a sort
fCmpValueDsc_kv= function (kv) { return function(ak,bk) { var a= kv[ak], b= kv[bk]; return (a||" ")==(b||" ") ? 0 : (a||" ") > (b||" ") ? -1 : 1 }; } //U: crea una funcion para comparar un atrbuto de ambos objetos, para pasarle a sort

cmpLength= fCmpAttr("length");

//*****************************************************************************
//S: algoritmos / lista de strings -> a lista de partes o ints
regex_map= function (l,regex) { //U: aplicar una regex a todos los elementos de una lista
	return l.map(function (e) {
		var m= e.match(regex);
		return [e].concat(m);
	});
}

parseint_map= function (l,regex) { //U: aplicar parseint a la captura de una regex sobre todos los elementos de una lista
	regex= regex || /(\d+)/;
	var r= [];
	for (var i=0; l && i<l.length; i++) {
		var e= l[i];
		var m= e.match(regex);
		if (m) {
			var n= parseInt(m[1]);
			r.push([e,n]);
		}
	}	
	return r;
}

//*****************************************************************************
//S: algoritmos / string varias lineas -> encontrar matches
parse_camel= function (e) { //A: AlPriPa -> ["Al","Pri","Pa"]
	return e.match(/[A-Z]+[^A-Z ]*/g);
}

regex_camel= function (e) { //U: AlPriPa -> Al.*?Pri.*?Pa.*? que machea "Algunos Principos de Palabras"
	return parse_camel(e).join(".*?");
}

match_camel= function (e,src) { //U: devuelve todas las lineas de src que tienen palabras que empiezan como e, ej. AlPriPa -> Al.*?Pri.*?Pa.*? que machea "Algunos Principos de Palabras"
	var eRe= regex_camel(e);
	return src.match(new RegExp(".*?"+eRe+".*","g"))||[];
}

match1_camel= function (e,src) { //U: devuelve la primera linea de src de match_camel
	return match_camel(e,src).sort(cmpLength)[0];
}

//*****************************************************************************
//S: algoritmos / aplicar una funcion a todos los elementos de un conjunto

length= function (o) { //D: una version generalizada
	if (o==null) { return 0; }
	else { var t= typeof(o.length);
		if (t=="function") { return o.length(); }
		else if (t!="undefined") { return o.length; }
		else { return length_kv(o); }
	}
}

fold= function (o,f,acc,wantsSorted) {try{
	var STOP_OK_EX= {};
	var stop= function (acc) { STOP_OK_EX.acc=acc; throw STOP_OK_EX; };

	if (o!=null) {
		if (typeof(o.getClass)=="function") {
			var c= new String(o.getClass());
			if (c.indexOf("Map")>-1) {
				var ks= toJs(o.keySet());
				if (wantsSorted) { ks= typeof(wantsSorted)=="function" ? ks.sort(wantsSorted) : ks.sort(); }
				for (var i in ks) { acc= f(o.get(ks[i]),ks[i],acc,stop,o); }
			}
		}
		else if (Array.isArray(o)) {
			if (wantsSorted) { o= typeof(wantsSorted)=="function" ? o.sort(wantsSorted) : o.sort(); }
			for (var i=0; i<o.length; i++) { acc= f(o[i],i,acc,stop,o); }
		}
		else if (typeof(o)=="object") { 
			
			var ks= keys_kv(o);
			if (wantsSorted) { ks= typeof(wantsSorted)=="function" ? ks.sort(wantsSorted) : ks.sort(); }
			for (var i in ks) { acc= f(o[ks[i]],ks[i],acc,stop,o); }
		}
	}
	}catch(ex){ if (ex===STOP_OK_EX) { acc= STOP_OK_EX.acc } else { throw(ex) } }; //A: se puede parar el fold lanzando STOP_OK_EX

	return acc;
}

foldIfKeyMatch= function (col, regex, cb, acc) {
	return fold(col,function (v,k,acc) { return k.match(regex) ? cb(v,k,acc) : acc });
}

fold_csv_str= function fold_csv_str(str,cb) {
	var names;
	return fold(str.split(/\r?\n/g), function (l,idx) {
		var v= l.split(/\t/g);
		if (idx==0) { names= v.map(function (s) { return s.toLowerCase()}); }
		else { cb(zipkv(names,v)); }
	});
}

kvfirst= function (v,k,acc) { 
	logm("DBG",9,"KV FIRST",{k: toJs(k), t: typeof(v)}); 
	logm("DBG",9,"KV FIRST",{k: k, v: v}); 
	acc[k]= v!=null && v[0] ; 
	return acc; 
};
kvfirstMap= function (o,acc) { return fold(o,kvfirst,acc ||{}); }

//*****************************************************************************
//S: construir claveXvalor a partir de listas
zipkv= function (lOfK,lOfV,acc,pfx,wantsOnlyNotNull) {
	var pfxOk= pfx||"";
	return fold(lOfK,function (v,k,acc) { var vv= (v[0]=="&") ? lOfV.slice(k) : lOfV[k]; if (!wantsOnlyNotNull || vv!=null) { acc[pfxOk+((v[0]=="&") ? v.substring(1) : v)]= vv }; return acc; },acc ||{});
}

arrayValuesToKv= function (a,pfx) { //U: devuelve un kv con una entrada con prefijo para cada valor del array
	pfx= pfx || "col";
	var r= {};
	for (var j=0; j<a.length; j++) { r[pfx+(j+1)]= a[j]; };
	return r;
}

kv_array= function (aX,dst,offs0,wantsToJs) { //U: devuelve un kv a partir del array [k1,v1,k2,v2,...]
	var a= wantsToJs ? toJs(aX) : aX;
	dst= dst || {}; for (var i=offs0||0; i<a.length; i+=2) { dst[toJs(a[i])]= wantsToJs ? toJs(a[i+1]) : a[i+1]; }
	return dst;
}




//*****************************************************************************
//S: algoritmos / nombres de archivos
seguro_str= function (s,caracterEscapeAntes,caracterEscapeDespues,caracteresPermitidos) {
	caracterEscapeAntes= caracterEscapeAntes || "_"; //A: seguro en nombres de archivo widows y linux
	caracterEscapeDespues= caracterEscapeDespues || caracterEscapeAntes;
	caracteresPermitidos= caracteresPermitidos || "a-zA-Z0-9"; //A: seguro en nombres de archivo widows y linux
	return (s+"").replace(new RegExp("[^"+caracteresPermitidos+"]","g"),function (m) { return caracterEscapeAntes+m.charCodeAt(0).toString(16)+caracterEscapeDespues; })
}

seguro_str_r= function (s,caracterEscapeAntes,caracterEscapeDespues) {
	caracterEscapeAntes= caracterEscapeAntes || "_";
	caracterEscapeDespues= caracterEscapeDespues || caracterEscapeAntes;
	return s.replace(new RegExp(caracterEscapeAntes+"([0-9a-fA-F]+)"+caracterEscapeDespues,"g"),function (m,h) { return String.fromCharCode(parseInt(h,16)); });
}

seguro_fname= seguro_str;
seguro_fname_r= seguro_str_r;

seguro_fpath= function (s) { return seguro_str(s,null,null,"a-zA-Z0-9/").replace(/^\//,""); }
seguro_fpath_r= seguro_str_r;

concat_path= function (head,tail,allowRoot) {
	head= head||""; tail= tail||"";
	if (allowRoot && tail[0]=="/") { return tail; }
	return head+((head.length && (head[head.length-1]!="/") && (tail[0]!="/")) ? "/" : "")+tail;
}

hash_fpath_num_parts= function (n) { //U: para asegurar que ningun dir tiene demasiadas entradas y traba el ls, separa el numero "n" en un dir cada un par de digitos y agrega la cantidad de digitos como prefijo de modo que al listarlos sigan ordenados, ej. n=12345 -> 06/01/23/012345 ; n=912345 -> 06/91/23/45/912345
  var s= n+"";
  var snorm= (s.length % 2 ? "0" : "") + s;
  var sparts= snorm.match(/(..)/g);
  sparts.unshift(padl("0",snorm.length,2));
  sparts.pop();
  sparts.push(snorm);
	return sparts;
}

hash_fpath_num= function (n) { //U: para asegurar que ningun dir tiene demasiadas entradas y traba el ls, separa el numero "n" en un dir cada un par de digitos y agrega la cantidad de digitos como prefijo de modo que al listarlos sigan ordenados, ej. n=12345 -> 06/01/23/012345 ; n=912345 -> 06/91/23/45/912345
  var fn= hash_fpath_num_parts(n).join("/");
  return fn;
}

//*****************************************************************************
//S: algoritmos / strings y plantillas
escape_regexp_str= function (str) { //U: devuelve la RegExp equivalente al literal str, ej. para construir expresiones regulares mezclando literales recibidos como parametro
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"); //VER: http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
}

delete_marked_str= function (s,markStart,markEnd) {
	return s.replace(new RegExp(escape_regexp_str(markStart)+"[^]*?"+escape_regexp_str(markEnd),"g"),"");
}

//*****************************************************************************
//S: wrappers
funcionComoA= function(funcionQueDevuelveResultado,noQuiereCopiaArgs) { //D: envuelve una funcion sincrona en una asincrona, ej. para hacerla compatible con una api asincrona
	return function () { try {
			var args= fArgsCopy(arguments);
			var cb= args.pop(); //D: CONVENCION! el callback va al final
			var r= funcionQueDevuelveResultado.apply(this,args);
		} catch (ex) { cb(null,ex,args); }
		noQuiereCopiaArgs ? cb(r) : cb(r,null,args);
	}
}
fAsAsync= funcionComoA;

//*****************************************************************************
//S: archivos/file_pack (un archivo con muchos archivitos adentro)
get_file_pack_meta_a_fromStr= function (pack,d,err,cb) { //A: lee meta de un string
	pack= typeof(pack)=="string" ? { fname: pack } : pack;
	var r= {ERROR: "no se pudo leer pack '"+pack.fname+"'"}; //DFLT
	if (!err && d>"") { //A: no es error 
		r= ser_kv_txt_r(d);	
		r.PmPackJOfs= parseInt((r.PmPackJOfs+"").replace(/^0*/,"")); //A: numero o NaN, no lanza excepcion
		r.PmPackIOfs= parseInt((r.PmPackIOfs+"").replace(/^0*/,"")); //A: numero o Nan, no lanza excepcion
		r.PmPackJLen= parseInt((r.PmPackJLen+"").replace(/^0*/,"")); //A: numero o Nan, no lanza excepcion
		if (r.PmPack!="001") { r.ERROR= "pack version desconocida '"+r.PmPack+"'" }
		else if (! (r.PmPackJOfs>0)) { r.ERROR= "pack j offset invalido '"+r.PmPackJOfs+"'" }
		else if (! (r.PmPackIOfs>0)) { r.ERROR= "pack i offset invalido '"+r.PmPackIOfs+"'" }
		else if (! (r.PmPackJLen>0)) { r.ERROR= "pack j len invalido '"+r.PmPackJLen+"'" }
		else { delete(r.ERROR); }
	}
	pack.meta= r;
	logm("DBG",9,"PACK_R META",{pack: pack, raw: d+""});
	cb(r);	
}

get_file_pack_meta_a= function (pack,cb) { //A: lee meta de un archivo, max meta=2k
	pack= typeof(pack)=="string" ? { fname: pack } : pack;
	get_file_slice_a(pack.fname,"txt",0,2048,function (d,err) { //A: max meta=2k
		get_file_pack_meta_a_fromStr(pack,d,err,cb);
	});
}

get_file_pack_idx1_a= function (pack,cb) { //D: consigue el json con los dirs
	pack= typeof(pack)=="string" ? { fname: pack } : pack;
	var conMeta_a= function () {
		if (pack.jidx) { //A: ya teniamos leido
			logm("DBG",8,"PACK_R OFS idx1 jidx",pack);
			cb(pack.jidx);
		}
		else { //A: lo leemos
			get_file_slice_a(pack.fname,"txt",pack.meta.PmPackJOfs,pack.meta.PmPackJLen,function(d,err) {
					logm("DBG",8,"PACK_R OFS idx1 jidx",{idxLen: (d+"").length, err: exceptionToString(err), d100: (d+"").substr(0,100)});
					pack.jidx= ser_json_r(d);
					cb(pack.jidx);	
			},function (err) {
				logm("ERR",8,"PACK_R OFS ERR idx1 jidx",{pack: pack, err: err});
				cb(err)});
		}
	};

	if (pack.meta) { conMeta_a(); }
	else { get_file_pack_meta_a(pack,conMeta_a); }
}

get_file_pack_jofs_a_fromKv= function (pack,Idx,p,cb) { //D: cuando ya tenes el kv
	cb(get_p(Idx,p+"/.",0,/([\/[{])/));
}

get_file_pack_jofs_a= function (pack,p,cb) { //D: consigue el offset de un dir en el indice
	pack= typeof(pack)=="string" ? { fname: pack } : pack;
	var con_idx1_jidx= function () {
		logm("DBG",8,"PACK_R OFS jidx",pack);
		get_file_pack_jofs_a_fromKv(pack,pack.jidx,p,cb);
	}

	get_file_pack_idx1_a(pack,con_idx1_jidx);	
}

get_file_pack_idx2_a= function (pack,fps,cbOk,cbFail) {
	pack= typeof(pack)=="string" ? { fname: pack } : pack;
	var fn; var fp= fps.replace(/\/[^/]+$/,function (x) { fn=x.substr(1); return "";});
	var conOfs_a= function (ofs) {
		logm("DBG",8,"PACK_R idx2",{ofs: ofs, fn: fn, fp: fp});
		if (!Array.isArray(ofs)) { (cbFail||cbOk)(null,"PACK_R: OFS idx2 NO ENCONTRADO"); }
		else { get_file_slice_a(pack.fname,"txt",pack.meta.PmPackIOfs+ofs[0],ofs[1]-ofs[0]+500,cbOk,cbFail);} //XXX:le sumo al offset para conseguir el "siguiente"
	}

	get_file_pack_jofs_a(pack,fp,conOfs_a); 
}

get_file_pack_a= function (pack,fps,ftype,cbOk,cbFail) { //D: consigue los datos de un archivo dentro de un pack
	pack= typeof(pack)=="string" ? { fname: pack } : pack;
	var fn; var fp= fps.replace(/\/[^/]+$/,function (x) { fn=x.substr(1); return "";});

	var conIdx2_a= function (idx2) {
		logm("DBG",8,"PACK_R idx2",{idx2: idx2, fn: fn, fp: fp});
		var ofsa= idx2!=null && idx2.match(new RegExp(fn+" (\\d+)\\n(P.*\\n)?\\S+ (\\d+)"))
		if (ofsa==null) { 
			logm("DBG",7,"PACK_R idx2 not_found",{idx2: idx2, fn: fn, fp: fp});
			(cbFail||cbOk)(null,"PACK_R: OFS file NO ENCONTRADO") 
		}
		else {
			var ofs= parseInt(ofsa[1]);
			var len= parseInt(ofsa[3])-ofs;
			logm("DBG",8,"PACK_R idx2 match",{ofs: ofs, len: len, idx2: idx2, fn: fn, fp: fp});
			get_file_slice_a(pack.fname,ftype,ofs,len,cbOk,cbFail);
		}
	}

	get_file_pack_idx2_a(pack,fps,conIdx2_a,cbFail);
}

get_file_pack_dir_stream_a= function(pack,cb) {
	pack= typeof(pack)=="string" ? { fname: pack } : pack;
	get_file_pack_idx1_a(pack,function () {
		var stIdx= nuevo_stream_visit(pack.jidx);
		var stDir= nuevo_stream_map(stIdx,function (e) {
			return isArray(e[0]) ? [e[1].replace(/\{/g,"/").replace(/^\/0/,"").replace(/\/\.$/,""),e[0]]  : STREAM_SKIP;
		},1);
		var stFilesDirTxt= nuevo_stream_map(stDir,function (e,st_cb) { var ofs= e[1];
			get_file_slice_a(pack.fname,"txt",pack.meta.PmPackIOfs+ofs[0],ofs[1]-ofs[0],st_cb,st_cb);
		});

		var stFilesDir= nuevo_stream_map(stFilesDirTxt,function (e) { //DBG: PJ("E",e);
			var p=null;
			return nuevo_stream_map( nuevo_stream_regex(/([PF])(\S+) ?\d*\n/g,e),
					function (ee) { //DBG: PJ("EE",ee);
						if (ee[1]=="P") { p= ee[2]; return STREAM_SKIP; }
						else { return (p ? p+"/"+ee[2] : ee[2]); }
					},1);
		},1);

		var stFiles= nuevo_stream_concat(stFilesDir);	
		cb(stFiles);
	});
}

//*****************************************************************************
//S: algoritmos / cache / ultimoUso
limpiar_cache_recienUsados= function (cache) {
	var claves= Object.keys(cache.elementoYuso)
	var elementosAntesCnt= claves.length;
	var cuantosHayQueBorrar= elementosAntesCnt - cache.cntMax;
	if (cuantosHayQueBorrar>0 || (cache.szMax && cache.szUsada>cache.szMax)) {
		claves= clavesOrdenadasPorPropiedadNumerica(cache.elementoYuso,"cuandoUso");
		for (var i=0; (i<cuantosHayQueBorrar || (cache.szMax && cache.szUsada>cache.szMax)) && i<claves.length; i++) {
			var k= claves[i]
			var e= cache.elementoYuso[k];
			if (e) { cache.szUsada-= e.sz; }
			delete(cache.elementoYuso[k]);
		}
	}
	logm("DBG",8,"CACHE LIMPIAR",{ cnt: claves.length, cntMax: cache.cntMax, borrados: i>0 ? claves.slice(0,i) : "NINGUNO" });
}

sea_cache_recienUsados= function (cache,k,v,sz,quiereLimpiarDespues) {
	var sz= typeof(v)=="string" ? v.length : sz || 0; //A: OJO! solo podemos contar el tamaño de strings
	var r= { cuandoUso: ahora(), valor: v, sz: sz};
	borrar_cache_recienUsados(cache,k); //A: descontamos el que vamos a reemplazar si estaba
	cache.szUsada+= sz; //A: YA cuento el tamaño, por si tengo que borrar para no pasarme de tamaño total
	if (!quiereLimpiarDespues) { limpiar_cache_recienUsados(cache); } //A: hice lugar si necesitaba
	cache.elementoYuso[k]= r;	//A: ahora agrego el elemento
	return v;
}

de_cache_recienUsados= function (cache,k) {
	var r= cache.elementoYuso[k];
	if (r) { 
		r.cuandoUso= ahora(); 
		return r.valor;
	}
}

borrar_cache_recienUsados= function (cache,k) {
	try { 
			var e= cache.elementoYuso[k];
			if (e) {
				cache.szUsada-= e.sz;
				delete(cache.elementoYuso[k]);
			}
	}
	catch (ex) {}; //A: si no estaba, no pasa nada	
}

borrarTodo_cache_recienUsados= function (cache) {
	cache.elementoYuso= {};
	cache.szUsada= 0;
}

nuevo_cache_recienUsados= function (nombre,cntMax,szMax) {
	var r= { nombre: nombre, cntMax: cntMax, szMax: szMax, szUsada: 0, elementoYuso: {}};
	for (var k in CacheApi_recienUsados) { r[k]= CacheApi_recienUsados[k] }
	return r;
}

CacheApi_recienUsados= {
	nuevo: nuevo_cache_recienUsados,
	de: de_cache_recienUsados,
	de_a: funcionComoA(de_cache_recienUsados,true),
 	sea: sea_cache_recienUsados,
	limpiar: limpiar_cache_recienUsados,
	borrar: borrar_cache_recienUsados,
	borrarTodo: borrarTodo_cache_recienUsados,
};

//*****************************************************************************
//S: algoritmos / cache / archivos 
nuevo_cache_archivos= function (nombre, path) {
	r= { nombre: nombre, path: path, dirsOk: {} }
	for (var k in CacheApi_archivos) { r[k]= CacheApi_archivos[k] }
	if (r.path!="NO_CACHE") {
		ensure_dir(path);
	}
	return r;
}

limpiar_cache_archivos= function (cache) {
	//XXX:TODO

}

sea_cache_archivos= function (cache,k,v,sz,quiereLimpiarDespues) {
	if (cache.path!="NO_CACHE") {
		var ps= seguro_fpath(k);
		var p= ps.replace(/[^\/]*$/,"");
		if (!cache.dirsOk[p]) { ensure_dir(cache.path+"/"+p); cache.dirsOk[p]= 1; }
		set_file(cache.path+"/"+ps,ser_planoOjson(v));
	}
	return v;
}

//XXX:CREAR INVALIDAR FILE CON *
borrar_cache_archivos= function(cache,k) {
	if (cache.path=="NO_CACHE") { return }
	var fname= cache.path+"/"+seguro_fpath(k);
	logm("NFO", 5, "CACHE ARCHIVOS BORRAR", {k: k, fname: fname});
  delete_file(fname);
};

de_cache_archivos= function (cache,k) {
	if (cache.path=="NO_CACHE") { return }
	var fpath= cache.path+"/"+seguro_fpath(k);
	var dtxt= get_file(fpath)
	logm("DBG",1,"CACHE ARCHIVOS GET",{k: k, fpath: fpath, cache_path: cache.path, data_ej: (dtxt+"").substr(0,100)});
	return ser_planoOjson_r(dtxt);
}

borrarTodo_cache_archivos= function (cache) { //XXX: TODO
}

CacheApi_archivos= {
	nuevo: nuevo_cache_archivos,
	de: de_cache_archivos,
	de_a: funcionComoA(de_cache_archivos),
 	sea: sea_cache_archivos,
	limpiar: limpiar_cache_archivos,
	borrar: borrar_cache_archivos,
	borrarTodo: borrarTodo_cache_archivos,
};

//*****************************************************************************
//S: algoritmos / cache / archivos  en phonegap
nuevo_cache_archivosMovil= function (nombre, pfx) {
	r= { nombre: nombre, pfx: pfx }
	for (var k in CacheApi_archivosMovil) { r[k]= CacheApi_archivosMovil[k] }
	var path= CFGLIB.pathToLib+"cache/"+pfx;
	ensure_dir(path,nullf,onFail);
	return r;
}

limpiar_cache_archivosMovil= function (cache) {
	//XXX:TODO
}

sea_cache_archivosMovil= function (cache,k,v,sz,quiereLimpiarDespues,quiereDirecto) {
	if (cache.soloLectura) { return ; }
	var path= CFGLIB.pathToLib+"cache/"+cache.pfx+seguro_fpath(k);
	var f1= function () { try {
		logm("DBG",7,"sea_cache_archivosMovil ",{k:k,path:path});
		
		set_file_bin_a(path,quiereDirecto ? v : ser_planoOjson(v),function () { 
			logm("DBG",1,"sea_cache_archivosMovil OK ",{k:k,path:path}); 
		}, function(err) {
			logm("DBG",7,"sea_cache_archivosMovil ERR ",{k:k,path:path,err:err});
		});
	} catch (ex) { 
		logm("ERR",3,"sea_cache_archivosMovil ",{k:k,message:ex.message});
	} };
	var pathDir= path.replace(/[^\/]*$/,"");
	pathDir.length>1 ? ensure_dir(pathDir,f1,f1) : f1();
}

borrar_cache_archivosMovil= function (cache,k) {
	var path= CFGLIB.pathToLib+"cache/"+cache.pfx+seguro_fpath(k);
		logm("DBG",7,"borrar_cache_archivosMovil ",{k:k,path:path});
		
	delete_file(path,
		function () { logm("DBG",1,"borrar_cache_archivosMovil OK ",{k:k,path:path}); }, 
		function(err) { logm("DBG",7,"borrar_cache_archivosMovil ERR ",{k:k,path:path,err:err}); }
	);
}

borrarTodo_cache_archivosMovil= function (cache,quiereSinPedirConfirmacion,cb) {
	var path= CFGLIB.pathToLib+"cache/"+cache.pfx;
	deleteAll_dir(path,quiereSinPedirConfirmacion,cb);
}

de_a_cache_archivosMovil= function (cache,k,cbok,cbf) {
	get_file_a(CFGLIB.pathToLib+"cache/"+((cache.pfx && cache.pfx!="") ? cache.pfx+"/" : "")+seguro_fpath(k),"bin",
		function (d) { 
			var v= ser_planoOjson_r(d); 
			cbok(v,(d||"").length);
		},
		cbf||function (err) { cbok(null,-1,err); });
}

CacheApi_archivosMovil= {
	nuevo: nuevo_cache_archivosMovil,
	de_a: de_a_cache_archivosMovil,
 	sea: sea_cache_archivosMovil,
	limpiar: limpiar_cache_archivosMovil,
	borrar: borrar_cache_archivosMovil,
	borrarTodo: borrarTodo_cache_archivosMovil,
};

//*****************************************************************************
//S: errores, coordinar con libcx!!!  
esCxError= function(data) {
	var r= (data==null) || (typeof(data)=="string" && (data.indexOf("LibCxException")!=-1 || data.indexOf("NECESITA CREDENCIALES")!=-1)) || data.LibCxException!=null;
	if (r) { logm("DBG",5,"esCxError?",{esError:r, data: ser_planoOjson(data).substr(0,100),}); }
	return r;
};

setCxError= function(msg,data) { //U: para generar una respuesta que de verdadero a esCxError
	return {"LibCxException": msg, data: data};
};


//*****************************************************************************
//S: wrappers
//XXX: generalizar para que tambien sirva para cache en db
//XXX: generalizar, agregar localStorage
envolver_contador= function (f) { //D: envuelve la funcion en otra que cuenta las veces que la llamaste, ej. para saber cuantos tiles borraste dentro de un poligono 
    var fConContador;
    fConContador= function () {
        fConContador.cuenta++;
        return f.apply(this,arguments);
    }
    fConContador.cuenta=0;
    return fConContador;
}

nuevo_cache_envuelto= function (cache,fun,fun_r) {
	var sea_x= cache.sea_ori= cache.sea;
	var de_a_x= cache.de_a_ori= cache.de_a;
	cache.sea= function (cache,k,v,sz,quiereLimpiarDespues) {
		cache.soloLectura || sea_x(cache,k,fun(v),sz,quiereLimpiarDespues);
	};
	cache.de_a= function (cache,k,cbok,cbf) {
		de_a_x(cache,k,function (data) { try {
				logm("DBG",9,"CACHE ENVUELTO CB 1",{cache: cache.nombre, k: k, data_ej: (data+"").substr(0,100)});
				var args= fArgsCopy(arguments);
				logm("DBG",9,"CACHE ENVUELTO CB 2");
				if (data!=null) { args[0]= fun_r(data); } //A: SOLO cambio data por aplicar la funcion a data, lo demas sigue el mismo protocolo
				logm("DBG",9,"CACHE ENVUELTO CB 3",{cache: cache.nombre, k: k, data_ej: (args[0]+"").substr(0,100)});
				cbok.apply(this,args);
		} catch (ex) { logmex("ERR",1,"CACHE ENVUELTO DE CB ERR",{ cache: cache.nombre, k: k},ex) }}, cbf);
	};
	return cache;
}

funcionConCacheDefault_a= function (cbQueActualiza,cacheDondeGuardo,keyF,cbIdx,quierePasarSizeACb) { //U: intenta llamar a la funcion, si va bien guarda los datos, si falla y tiene datos guardados los usa
	logm("DBG",5,"funcionConCacheDefault_a MK ",cacheDondeGuardo);
	var r= (function () {try{
		logm("DBG",8,"funcionConCacheDefault_a",{args:args,clave:clave});
		var args= fArgsCopy(arguments);
		var cb= args[cbIdx]; //U: indice de la que hay que llamar con los datos
		var clavep= keyF.apply(this,args);
		//XXX:E5 asegurar consistencia!
		var clave= seguro_fpath_r(GLOBAL.CFG_URL_SEC ? ofuscar_url(seguro_fpath(clavep)) : clavep); //A: revierto seguro porque cache lo aplica de nuevo

		args[cbIdx]= function (data,sz) {try{
			var argsParaCb= quierePasarSizeACb ? fArgsCopy(arguments) : fArgsCopy(arguments,2,[data]);
			if (!esCxError(data)) {try{ //A: consegui datos nuevos, actualizo el cache
				cacheDondeGuardo.sea(cacheDondeGuardo,clave,data,sz);
				logm("DBG",8,"CACHE OK GUARDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data_sz: sz, data_ej: data && (data+"").substr(0,100)});
				cb.apply(this,argsParaCb); //A: llamo a la funcion que esperaba el resultado con los datos nuevos	
			}catch(ex){ logmex("ERR",1,"CACHE INVOCANDO CB",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); }}
			else {try{//A: no consegui los datos, me vino error
				logm("DBG",8,"CACHE NO CONSEGUI DATOS NUEVOS, INTENTO CACHE",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data_ej: data && (data+"").substr(0,100)});

				cacheDondeGuardo.de_a(cacheDondeGuardo,clave, function (data,sz,err) {try{
					if (data!=null && !err) { logm("DBG",8,"CACHE ESTABA",{cache: cacheDondeGuardo.nombre, clave: clave, args: args, data_ej: data && (data+"").substr(0,100)}); //XXX:MAU agregar que puede haber NULL para esa clave
						argsParaCb[0]= data;
						cb.apply(this,argsParaCb);
					}
					else { 
						logm("DBG",8,"CACHE FALTA funcionConCacheDefault_a",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data_ej: data && (data+"").substr(0,100)});
						cb.apply(this,argsParaCb);
					}
				}catch(ex){ logmex("ERR",1,"CACHE INVOCANDO CB",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); } });
			}catch(ex){ logmex("ERR",1,"CACHE BUSCANDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); }}
		}catch(ex){ logmex("ERR",1,"CACHE RECIBIENDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); }} ; 
		//A: reemplace el callback que recibe el resultado por mi funcion que si llego bien lo guarda y se lo pasa y sino, le pasa uno del cache
		cbQueActualiza.apply(this, args);	
	}catch(ex){ logmex("ERR",1,"CACHE PIDIENDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args},ex); }}); 
	//A: r es una funcion que de afuera se ve igual que la original, pero si la original falla usa datos de la ultima vez que funciono
	r.cbQueActualiza= cbQueActualiza;
	r.cache= cacheDondeGuardo;
	r.keyF= keyF;
	r.funcionEnvuelta= cbQueActualiza;
	return r;
};

funcionConCache_a= function (cbSiNoEsta,cacheDondeGuardo,keyF,cbIdx,quierePasarSizeACb) {
	logm("DBG",5,"funcionConCache MK ",cacheDondeGuardo);
	var r= (function () { try {
		var args= fArgsCopy(arguments); //A: los args de la LLAMADA ORIGINAL a la funcion
		var clavep= keyF.apply(this,args);
		//XXX:E5 asegurar consistencia!
		var clave= seguro_fpath_r(GLOBAL.CFG_URL_SEC ? ofuscar_url(seguro_fpath(clavep)) : clavep); //A: revierto seguro porque cache lo aplica de nuevo
		logm("DBG",8,"funcionConCache_a",{args:args,clave:clave});
		var cb= args[cbIdx]; //U: indice de la que hay que llamar con los datos
	 	cacheDondeGuardo.de_a(cacheDondeGuardo,clave, function (data,sz,err) { try {
			if ((data!=null) && !err) { logm("DBG",8,"CACHE ESTABA",{cache: cacheDondeGuardo.nombre, clave: clave, sz: sz, args: args, data_ej: data && (data+"").substr(0,100)}); //XXX:MAU agregar que puede haber NULL para esa clave en el cache
				if (quierePasarSizeACb)  { args.unshift(sz); }
				args.unshift(data);
				cb.apply(this,args);
			}
			else { logm("DBG",8,"CACHE FALTA funcionConCache_a",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, errNotNull: err+"", err: err, data_ej: data && (data+"").substr(0,100)});
					args[cbIdx]= function (data,sz,err) { try {
						var argsCb= quierePasarSizeACb ? fArgsCopy(arguments) : fArgsCopy(arguments,2,[data]);
						if (!esCxError(data)) {
							cacheDondeGuardo.sea(cacheDondeGuardo,clave,data,sz);
							logm("DBG",8,"CACHE GUARDO",{cache: cacheDondeGuardo.nombre,clave: clave, sz: sz, args: args, data_ej: data && (data+"").substr(0,100)});
						}
						else {
							logm("DBG",8,"CACHE ES ERROR CX NO GUARDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data_ej: data && (data+"").substr(0,100)});
						}
						cb.apply(this,argsCb);	
					}catch(ex){logmex("ERR",1,"CACHE INVOCANDO CON DATOS",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex);}};
				cbSiNoEsta.apply(this, args);	
			}
		} catch (ex) { logmex("ERR",1,"CACHE INVOCANDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); } });
	} catch (ex) { logmex("ERR",1,"CACHE BUSCANDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); } });
	r.cbQueActualiza= cbSiNoEsta;
	r.cache= cacheDondeGuardo;
	r.keyF= keyF;
	r.funcionEnvuelta= cbSiNoEsta;
	return r;
};

//XXX:MAURICIO:agregar que si ya hay un thread calculando el valor, los demas esperen en vez de TAMBIEN calcularlo
funcionConCache= function (cbSiNoEsta,cacheDondeGuardo,keyF,quiereLlamarSiempre) {
	logm("DBG",1,"funcionConCache MK",cacheDondeGuardo);
	var r= function () {
		try {
			logm("DBG",9,"funcionConCache",cacheDondeGuardo);
			var args= fArgsCopy(arguments);
			var clave= keyF.apply(this,args);
			var data= quiereLlamarSiempre ? null : cacheDondeGuardo.de(cacheDondeGuardo,clave);
			if (data!=null) { logm("DBG",8,"CACHE ESTABA",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data_ej: data && (data+"").substr(0,100)});
			}
			else { logm("DBG",8,"CACHE FALTA funcionConCache",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data_ej: data && (data+"").substr(0,100)});
				try {
					data= cbSiNoEsta.apply(this,args);
					cacheDondeGuardo.sea(cacheDondeGuardo,clave,data);
				} catch (ex) { 
					logmex("ERR",1,"CACHE INVOCANDO CON DATOS",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); 
					throw(ex); //A: vuelvo a lanzar la excepcion porque otros la precisan, ej. libcx para avisarle al cliente
				};
			}
			return data;
		} catch (ex) { 
			logmex("ERR",1,"CACHE INVOCANDO",{cache: cacheDondeGuardo.nombre,clave: clave, args: args, data: data},ex); throw(ex); 
			throw(ex); //A: vuelvo a lanzar la excepcion porque otros la precisan, ej. libcx para avisarle al cliente
		}
	};
	r.cbSiNoEsta= cbSiNoEsta;
	r.keyF= keyF;
	r.cacheDondeGuardo= cacheDondeGuardo;
	r.cache_borrar= function () {
		var args= fArgsCopy(arguments);
		var clave= keyF.apply(this,args);
		logm("DBG",8,"funcionConCache CACHE_BORRAR",{args:args,clave:clave});
		cacheDondeGuardo.borrar(cacheDondeGuardo,clave);
	};
	r.cache_sea= function () { //U: establece DIRECTAMENTE el valor para unos parametros
		var args= fArgsCopy(arguments);
		var v= args.pop();
		var clave= keyF.apply(this,args);
		logm("DBG",8,"funcionConCache CACHE_SEA",{args:args,clave:clave});
		cacheDondeGuardo.sea(cacheDondeGuardo,clave,v);
	};
	r.cache_de= function () { //U: establece DIRECTAMENTE el valor para unos parametros
		var args= fArgsCopy(arguments);
		var clave= keyF.apply(this,args);
		logm("DBG",8,"funcionConCache CACHE_DE",{args:args,clave:clave});
		return cacheDondeGuardo.de(cacheDondeGuardo,clave);
	};	
	return r;
}

//XXX: descomponer y hacer mas configurable y componible!
funcionConCache_a_archivos= function(nombre, funcion, cbIdx, funcionClavePara, prefijoNombreArchivo, cache, quierePasarSizeACb) { //D: envuelve una funcion con cache, si esta en movil usa archivos encriptados para cuando este offline
	prefijoNombreArchivo = prefijoNombreArchivo || "";

	var cache = cache || nuevo_cache_recienUsados(nombre, 1); //A:DFLT

	var funcionConCacheArchivos = funcion; //A: DFLT, ej. cxAjaxCall que trae los datos

	if (GLOBAL.enAppMovil || GLOBAL.CACHE_LOCALSTORAGE) {
		var cacheArchivos = nuevo_cache_envuelto(nuevo_cache_archivosMovil(nombre + "_archivos", prefijoNombreArchivo), encriptar, encriptar_r);
		funcionConCacheArchivos = funcionConCache_a(funcion, cacheArchivos, funcionClavePara, cbIdx, true); //A: si tiene los datos en el cache, que nos pase el size para el cache recienUsados
	}
	else if (GLOBAL.rtType=="java") {
		var cacheArchivos = nuevo_cache_archivos("x_cache_fun/"+nombre, "x_cache_fun/"+nombre);
		funcionConCacheArchivos = funcionConCache_a(funcion, cacheArchivos, funcionClavePara, cbIdx,true);
	}

	var funcionr = funcionConCache_a(funcionConCacheArchivos, cache, funcionClavePara, cbIdx, quierePasarSizeACb); //A: aca, como quiera la funcion
	funcionr.cache = cache;
	funcionr.cacheArchivos = cacheArchivos;
	funcionr.cacheBorrar= function () {
		if (funcionr.cacheArchivos) { funcionr.cacheArchivos.borrarTodo(funcionr.cacheArchivos,true); }
		if (funcionr.cache) { funcionr.cache.borrarTodo(funcionr.cache); }
	}
	return funcionr;
}

funcionConCacheDefault_a_archivos= function(nombre, funcion, cbIdx, funcionClavePara, prefijoNombreArchivo, cache) { //D: envuelve una funcion con cache, si esta en movil usa archivos encriptados para cuando este offline
	prefijoNombreArchivo = prefijoNombreArchivo || "";
	var cache = cache || nuevo_cache_recienUsados(nombre, 1);

	var funcionConCacheArchivos = funcion; //A: DFLT

	if (GLOBAL.enAppMovil || GLOBAL.CACHE_LOCALSTORAGE) { //XXX:MAU cambiar por tiene filesystem!
		var cacheArchivos = nuevo_cache_envuelto(nuevo_cache_archivosMovil(nombre + "_archivos", prefijoNombreArchivo), encriptar, encriptar_r);
		funcionConCacheArchivos = funcionConCacheDefault_a(funcion, cacheArchivos, funcionClavePara, cbIdx,true);
	}
	else if (GLOBAL.rtType=="java") {
		var cacheArchivos = nuevo_cache_archivos("x_cache_fun/"+nombre, "x_cache_fun/"+nombre);
		funcionConCacheArchivos = funcionConCacheDefault_a(funcion, cacheArchivos, funcionClavePara, cbIdx);
	}

	var funcionr = funcionConCacheDefault_a(funcionConCacheArchivos, cache, funcionClavePara, cbIdx);
	funcionr.cache = cache;
	funcionr.cacheArchivos = cacheArchivos;
	funcionr.cacheBorrar= function () {
		if (funcionr.cacheArchivos) { funcionr.cacheArchivos.borrarTodo(funcionr.cacheArchivos,true); }
		if (funcionr.cache) { funcionr.cache.borrarTodo(funcionr.cache); }
	}
	return funcionr;
}

//*****************************************************************************
//S: validaciones
validate_pass= function(security) { //XXX:MOVER:a lib, asi tambien se puede usar en el backend
        var msg = "";
        var newPassHasCorrectLength = security.newPass.length > 5; //XXX:CFG
        var newPassContainsNumber = /\d/.test(security.newPass);
        var newPassContainsLetter = /[a-zA-Z]/.test(security.newPass);

        if (!security.currentPass || !security.newPass || !security.newPassCheck) {
            msg = "Falta ingresar al menos un dato";
            return msg;
        }
        if (security.newPass != security.newPassCheck) {
            msg = "La clave nueva no coincide con la repeticion de la misma";
            return msg;
        }
        if (security.currentPass != Cfg.pass) {
            msg = "Contraseña actual incorrecta";
            return msg;
        }
        if (!(newPassHasCorrectLength && newPassContainsNumber && newPassContainsLetter)){
            msg = "La contraseña debe tener una longitud de 6 caracteres como mínimo y contener al menos un número y una letra";
            return msg;
        }
        return msg;
}

easyp_user= function (u) { return hash_string(u).toLowerCase().replace(/[^a-z0-9]/,"").substr(0,8); }

easyp_user_all= function (txt) {
	var r= txt.split(/[\r\n]+/).map(function (l) { var u= l.toLowerCase().match(/(\S+)/);
		return u ? u[1]+"   "+easyp_user(u[1]) : "";
	}).join("\n");
	return r;
}

//*****************************************************************************
//S: estructuras de datos
fId= function (v) { return v; } //U: la funcion identidad

SetPrototype= {
	push: function (v,k) { k= k || this.keyF(v); this.data[k]= v; },
	length: function () { return Object.keys(this.data).length; },
	asArray: function () { var d= this.data; return Object.keys(d).map(function(k) { return d[k]; }) },
}

nuevo_set= function (keyF,dataAsKv) { //U: tiene push, pero cada elemento (segun lo transforma keyF) aparece solo una vez
	return Object.create(SetPrototype,{data: {value: dataAsKv || {}, writable: true}, keyF: {value: keyF || ser_json}});
}

//*****************************************************************************
//S: streams
STREAM_END= {}; //U: lo devuelve next como final del stream
STREAM_SKIP= {STREAM_SKIP:1}; //U: lo devuelve la funcion de stream_map si quiere saltear un elemento

ensure_stream= function ensure_stream (x, wantsKeys) { //U: promociones tipicas a stream
	return Array.isArray(x) ? nuevo_stream_array(x, wantsKeys) :
		(typeof(x)=="object" ? 
			((""+x.TIPO).match(/^STREAM/) ?  x
				: nuevo_stream_map(nuevo_stream_array(keys_kv(x)),function (k) { return [x[k],k] },true,true))
			: nuevo_stream_array([x]));
}

StreamPrototype= { TIPO: "STREAM", length: null, };
StreamPrototype.next= function () {};
StreamPrototype.next_a= function (cb) { cb(this.next()); }; //U: next_a esta SIEMPRE, next solament si el stream es sincrono //XXX:CUIDADO si cb va a llamar a next_a tiene que usar set_timeout para liberar el stack 
StreamPrototype.reset= function () { logm("ERR",1,"STREAM RESET NOT IMPLEMENTED",this.TIPO); }
nuevo_stream= function (nextFn,state,length) { //U: crea un stream generico
	var me= Object.create(StreamPrototype);
	if (nextFn) {me.nextFn= nextFn};	
	if (state) {me.state= state};	
	if (length) {me.length= length};	
	return me;
}

//U: un stream que devuelve cada elemento de un array
StreamArrayPrototype= Object.create(StreamPrototype);
StreamArrayPrototype.next= function () { return this.idx<this.data_.length ? this.wantsIdx ? [this.data_[this.idx],this.idx++]: this.data_[this.idx++] : STREAM_END };
StreamArrayPrototype.reset= function () { this.idx= 0; };
StreamArrayPrototype.TIPO= "STREAM_ARRAY";
nuevo_stream_array= function (unArray, wantsIdx) {
	return Object.create(StreamArrayPrototype, {data_: { value: unArray }, idx: { value: 0, writable: true }, length: { value: unArray.length }, wantsIdx: { value: wantsIdx}});
}

//U: un stream que devuelve hasta N elementos de otro
nuevo_stream_truncado= function (unStream,maximo,minimo) {
  var r= nuevo_stream_map(unStream,function stream_truncado_map(e,sts) {
    var cnt= (sts.cnt= (sts.cnt==null ? 0 : (1 + sts.cnt)));
    //logm("DBG",1,"STREAM_TRUNCADO_NEXT",{sts: sts, minimo: minimo, maximo: maximo, e: e});
    return ((cnt < (minimo||0)) ? STREAM_SKIP : ((maximo==null) || (cnt < maximo) ? e : STREAM_END));
  }, true,false,true);
  r.TIPO= "STREAM_TRUNCADO";
  return r;
}


//U: un stream que devuelve los numeros en un rango
StreamRangePrototype= Object.create(StreamPrototype);
StreamRangePrototype.next= function () { this.idx+= this.paso; if (this.minimo<= this.idx && this.idx<this.maximo) { return this.idx } else { return STREAM_END; }};
StreamRangePrototype.reset= function () { this.idx= this.paso>0 ? this.minimo-this.paso : this.maximo-this.paso-1; };
StreamRangePrototype.TIPO= "STREAM_RANGE";

nuevo_stream_range= function (maximo,minimo,paso) {
	minimo= minimo || 0;
	paso= paso || 1;
	var r= Object.create(StreamRangePrototype, {idx: { value: 0 , writable: true }, maximo: {value: maximo}, minimo: { value: minimo}, paso: { value: paso }});
	r.reset();
	return r;	
}

//U: un stream que aplica una funcion a cada elemento devuelto por otro stream
StreamMapPrototype= Object.create(StreamPrototype); 
StreamMapPrototype.next= function () { var my=this; var r= this.stream.next(); var rmapped= (r==STREAM_END) ? r : (this.wantsApply) ? this.fun.apply(null,(Array.isArray(r) ? r : [r]).concat(my.wantsSts ? [my.sts] :[])) : this.fun(r,this.sts); return rmapped==STREAM_SKIP ? this.next() : rmapped };
StreamMapPrototype.next_a= function (cb) { var my= this; 
	var cb2= function (r) { 
		if (r==STREAM_SKIP) { 
			this.x_skip_cnt= (this.x_skip_cnt||0)+1; 
			if (this.x_skip_cnt>CfgMaxRecursiveCallCnt) { this.x_skip_cnt=0; fRunDelayO(1,my.stream,my.stream.next_a,cb1); logm("DBG",9,"StreamMapPrototype.next_a TRAMPOLIN"); } 
			else { my.stream.next_a(cb1) };
			//A: cada 100 skips hacemos un "trampolin" para que no se llene el stack
		} 
		else { 
			this.x_skip_cnt=0; //A: reseteamos el contador del tamaño del stack por recursion
			this.idx++; //A: contamos un elemento	
			cb(r); 
		} 
	};

	var cb1= function (r) { 
		if (r==STREAM_END) { cb(r) } 
		else { 
			if (my.wantsApply) { my.fun_a.apply(null,(Array.isArray(r) ? r : [r]).concat(my.wantsSts ? [my.sts,cb2] :[cb2])) } 
			else { if (my.wantsSts) { my.fun_a(r,my.sts,cb2) } else { my.fun_a(r,cb2) } }
		}
	};
	my.stream.next_a(cb1)
};
StreamMapPrototype.reset= function () { this.stream.reset(); this.sts= {StreamMapSts: 1}; };

StreamMapPrototype.TIPO= "STREAM_MAP";

nuevo_stream_map= function (aStream, aFun, aFunIsSync, wantsApply, wantsSts) {
	return Object.create(StreamMapPrototype,{stream: { value: ensure_stream(aStream) }, fun_a: { value: aFunIsSync ? fAsAsync(aFun) : aFun }, fun: { value: aFun }, wantsApply: {value: wantsApply}, wantsSts: {value: wantsSts}, sts: {value: {StreamMapSts: 1}, writable: true}} );
}


//U: un stream de matches globales en un string, next devuelve cada match
StreamRegexPrototype= Object.create(StreamPrototype);
StreamRegexPrototype.next= function () { 
	var v= "";
	for(var ic= this.re.lastIndex; v=="" && ic==this.re.lastIndex; this.re.lastIndex++) {
		v= this.re.exec(this.string);
	}
	//A: para matchear lineas SIN el enter, podemos usar /.*/ PERO para que NO matchee para siempre un string de length=0, si NO avanzo lastIndex, lo hacemos avanzar y probamos de nuevo 
	return (v || STREAM_END); 
};

StreamRegexPrototype.next_a= function (cb) { var my= this;
	var f= function (s) { var m= my.re.exec(s); cb(m ? (my.idx!=null ? m[my.idx] : m) : STREAM_END) }; 
	var ss= this.string;
	if (typeof(ss)=="function") { ss(f) } else { f(ss) };
};
StreamRegexPrototype.reset= function () { this.re.lastIndex=0; };
StreamRegexPrototype.TIPO= "STREAM_REGEX";

nuevo_stream_regex= function (aRegex, aString, aIdx) {
	var o= Object.create(StreamRegexPrototype,{string: {value: aString}, re: { value: aRegex }, idx: { value: aIdx }});
	o.reset();
	return o;
}

//U: devuelve el producto cartesiano de los streams del array, que deben soportar "reset"
StreamCrossPrototype= Object.create(StreamPrototype);
StreamCrossPrototype.next= function () { 
		var a= this.args; 
		var i; var v;
		for (i=0,v= STREAM_END; (v==STREAM_END||a.length<=i) && i<this.streams.length; i++) {
			//A: mientras no tenia valor o no consegui porque se me acabo el stream
			v= this.streams[i].next(a);
			a[i]= v;
		}
		logm("DBG",9,"StreamCross next before reset",{vIsStreamEnd: v==STREAM_END, i: i, iMax: this.streams.length, a: a});
		//A: avanzamos streams hasta conseguir uno que no se haya terminado O se terminaron todos
		for (i=i-2;v!=STREAM_END && i>=0; i--) { //A: el i-esimo dio un valor nuevo mas
			this.streams[i].reset(); //A: empezamos de nuevo el i-esimo menos uno
			v= this.streams[i].next(a);
			a[i]= v;
			logm("DBG",9,"StreamCross reset",{i: i, iMax: this.streams.length, v: v});
		}
		logm("DBG",9,"StreamCross next after reset",{vIsStreamEnd: v==STREAM_END, i: i, iMax: this.streams.length, a: a});
		return (v!=STREAM_END) ? a.slice() : v; //A: a.slice makes a shallow copy
};

StreamCrossPrototype.next_a= function (cb) {
	var my= this;
	var a= my.args; 
	var i=0;
	var onVi= function (v) {
		a[i]= v; i++;
		if ((v==STREAM_END||a.length<=i) && i<my.streams.length) {
			my.streams[i].next_a(onVi);
		}
		else { 
			logm("DBG",9,"StreamCross next before reset",{vIsStreamEnd: v==STREAM_END, i: i, iMax: my.streams.length, a: a});
			//A: avanzamos streams hasta conseguir uno que no se haya terminado O se terminaron todos
			i=i-1;
			onVi2(v); 
		}
	};

	var onVi2=function (v) {
		if (v!=STREAM_END) { //A: el i-esimo dio un valor nuevo mas
			a[i]= v; 
			i--;
			if (0<=i) {
				my.streams[i].reset(); //A: empezamos de nuevo el i-esimo menos uno
				logm("DBG",9,"StreamCross reset",{i: i, iMax: my.streams.length, v: v});
				my.streams[i].next_a(onVi2);
			}
			else { cb(a.slice()) } //A: pasamos proximo valor
		}
		else { cb(v); } //A: terminamos
	}	

	my.streams[0].next_a(onVi);
}
StreamCrossPrototype.reset= function () { fold(this.streams,function (st) { st.reset(); }) };
StreamCrossPrototype.TIPO= "STREAM_CROSS";

nuevo_stream_cross= function (aArrayOfStreams) { 
	return Object.create(StreamCrossPrototype,{streams: { value: aArrayOfStreams.map(ensure_stream) }, args: { value: [], writable: true }});
}

//U: devuelve la concatenacion de varios streams
StreamConcatPrototype= Object.create(StreamPrototype);
StreamConcatPrototype.next= function () { 
	this.streamCur_= this.streamCur_ || this.stream_.next(); 
	while (this.streamCur_!=STREAM_END) {
		var r= this.streamCur_.next();
		if (r==STREAM_END) { this.streamCur_= this.stream_.next(); }
		else { return r; }
	} 
	return STREAM_END;
}

StreamConcatPrototype.next_a= function (cb) { 
	var my= this;
	var conElemento= function (e) {
		if (e==STREAM_END) { //A: se acabo un stream
			logm("DBG",9,"StreamConcat STREAM NEXT");
			my.stream_.next_a(conStream);
		}
		else { //A: conseguimos elemento y lo devolvemos
			logm("DBG",9,"StreamConcat ELEMENTO");
			cb(e); 
		} 
	}	

	var conStream= function (s) {
		if (s==STREAM_END) { cb(STREAM_END); } //A: se acabaron los streams
		else { my.streamCur_=s; s.next_a(conElemento); }
	}
	
	if (my.streamCur_) { conStream(my.streamCur_) } else { 
		logm("DBG",9,"StreamConcat STREAM FIRST");
		my.stream_.next_a(conStream) 
	};	
}
StreamConcatPrototype.reset= function () { this.streamCur_= null; this.stream_.reset(); };
StreamConcatPrototype.TIPO= "STREAM_CONCAT";

nuevo_stream_concat= function (aStreamOfStreams) {
	return Object.create(StreamConcatPrototype,{stream_: {value: nuevo_stream_map(aStreamOfStreams,ensure_stream,true,true)}});
}

take_stream= function (aStream,n,dst) { //U: tomar N elementos de un stream
	if (typeof(dst)=="function") { dst= {push: dst} };
	dst= dst || [];
	var v= null;
	for (var i=0; n==null || i<n; i++) { var v= aStream.next(); if (v==STREAM_END) { dst.WANTS_EOS && dst.push_eos(STREAM_END); break; } dst.push(v); }
	return dst;
}

take_stream_a= function(aStreamOrFunc,n,dst,cb) {
	if (typeof(dst)=="function") { dst= {push_a: dst} };

	var control= {stop: false};
	var aStream;

	var cnt=1;
	var cbCalled= false;

	var cont= function () {
		if ((cnt % CfgMaxRecursiveCallCnt)==0) { fRunDelayO(0,aStream,aStream.next_a,paraCadaValor) }
		else { aStream.next_a(paraCadaValor); }
	}

	var paraCadaValor= function (v) { control.cnt= cnt++;
		if ((n && n<cnt) || v==STREAM_END || control.stop || (dst && dst.done) ) { 
			control.stopped= new Date();
			if (cb && !cbCalled) { cbCalled= 1; cb(dst); } 
		}
		else if (dst && v!=STREAM_SKIP) { 
			if (dst.push_a) { dst.push_a(v,cont) }
			else { if (dst.push) { dst.push(v) }; cont() }
		}
		else { cont(); }
	}

	if (typeof(aStreamOrFunc)=="function") { 
		aStreamOrFunc(function (s) { aStream=ensure_stream(s); if (aStream!=null) { cont(); } else { paraCadaValor(STREAM_END); } }); }
	else { aStream= ensure_stream(aStreamOrFunc); if (aStream!=null) { cont(); } else { paraCadaValor(STREAM_END); } }

	return control;
}

AccMostrarResultadoPrototype= {
	push: cbMostrarResultado,
	push_a: fAsAsync(cbMostrarResultado),
}

nuevo_acc_mostrarResultado= function () { 
	return Object.create(AccMostrarResultadoPrototype);
}

//U: un acumulador que guarda en varios archivos de tamaño maximo
//XXX: separar closeChunk para que en vez de eso pueda llamar cache_sea como en techZones_srv
AccChunksFilePrototype= {
	push: function (es) { if (this.s.length+es.length>this.lenMax) { this.closeChunk_(); this.fcnt++; this.s= ''; }; this.s+=es+(this.sep||"\n");},
	close: function () { this.closeChunk_("DONE"); },
	closeChunk_: function (endS) { set_file(this.pathPfx+"_"+this.fcnt,this.s+"CHUNKEND "+(endS||""));  },
}

nuevo_acc_chunksFile= function (pathPfx,lenMax,sep) {
	return Object.create(AccChunksFilePrototype,{pathPfx: { value: pathPfx }, fcnt: {value: 0, writable: true}, s: { value: '', writable: true}, lenMax: { value: lenMax || 10000 }, sep: { value: sep || "\n"}});
}

AccChunksCachePrototype= Object.create(AccChunksFilePrototype);
AccChunksCachePrototype.closeChunk_= function (s) { 
	this.unaFuncionArgs_.idx= this.fcnt;	
	this.unaFuncionConCache_.cache_sea(this.unaFuncionArgs_,(this.wantsObject ? ser_json_r(this.s) : this.s)+(this.endMark ? this.endMark+(s||"") : ""));
}

nuevo_acc_chunksCache= function (unaFuncionConCache,unaFuncionArgs,wantsObject,lenMax) {
	return Object.create(AccChunksCachePrototype,{unaFuncionConCache_: { value: unaFuncionConCache }, unaFuncionArgs_: { value: unaFuncionArgs}, wantsObject: { value: wantsObject}, fcnt: {value: 0, writable: true}, s: { value: '', writable: true}, lenMax: { value: lenMax || 10000 }, endMark: { value: 'Z\tEND', writable: true}});
}

//************************************************************
//S: db, comun
caseToLower_sql= function (sql) { //U: sin romper los strings
  return sql.replace(/([^']*)('[^']*')?/g,function (x,cmd,str) { return ((cmd||'').toLowerCase()+(str||'')); });
}

parse_sql= dbParse= function parse_sql(sql, wantsSqlLowerCase) { //D: parsea WHERE $miparam1:superSql='pepe' AND $miparam2>5 para dbExec
	var re=/\$([a-zA-Z0-9_\.]*)(?::([a-zA-Z]*))?/g
	var names=[]; var types={};
	//logm("DBG",1,"XXX",typeof(sql));
	var sqlSinComments= delete_marked_str(sql,"/*","*/"); //A: borramos los comentarios
	var sqlclean= sqlSinComments.replace(/;\s*$/,"").replace(/[\r\n\t ]+/g," "); //XXX:manejar para distintos drivers
	if (wantsSqlLowerCase) { sqlclean= caseToLower_sql(sqlclean); }
	
	var sqlCambiaConParams= false;
	var sqlstd= sqlclean.replace(re,function (exprParametro,nx,t) { 
		var reemplazo= "?"; //DFLT
		var n= nx.toLowerCase(); 
		var tipo= types[n] || {nombre: t, handlerInfo: {}};  //DFLT //U: el tipo del parametro
		//XXX: podriamos agregar un caso para los dates
		var funcParaTipo= t ? GLOBAL[t] : null;
		if (funcParaTipo) { //A: hay que llamar una funcion para este tipo
			var handlerInfo= funcParaTipo(t,n,tipo); //A: la funcion nos dice como se maneja este tipo
			if (handlerInfo.sqlParaVal) { reemplazo= exprParametro; sqlCambiaConParams= true; }	
			else if (handlerInfo.sql) { reemplazo= handlerInfo.sql; }
			tipo.handlerInfo= handlerInfo;
		}
		else { //A: caso estandard, la funcion de parametros del driver nos sirve
		}
		names.push(n); 
		types[n]= tipo; 
		return reemplazo;
	});	
	return { sql: sql, sqlstd: sqlstd, names: names, types: types, sqlCambiaConParams: sqlCambiaConParams};
}


/* TIPOS ESPECIALES EN SQL
FUNCIONA: los tipos de datos que paso en el sql se implementan con funciones arbitrarias que tengan el
mismo nombre, ej. $tipos:SqlListaDeNumeros llama a la funcion SqlListaDeNumeros que devuelve el string
sql para los numeros en el array "tipos" de los parametros, en cambio $imagen:JpgParaCerta genera el sq
l apropiado y ADEMAS hace las transformaciones necesarias desde el blob encodeado base_64 que recibe a
lo que hay que insertar en la DB certa

XXX: convertirlo en un "compilador" que genere el js y sql a ejecutar una sola vez (ahora es un interprete)

*/

SqlListaDeNumerosSql= function (nombre,tipo,paramsKvNorm) {
	var valor= paramsKvNorm[nombre]; //XXX: considerar que sea nulo, poner un cartelito de log lindo para no debugguear mil horas si nos pasa
	var sqlDeReemplazo= isArray(valor) ? valor.join(",").replace(/[^0-9.,-]/g,"") : ""; //A: por seguridad SOLO numeros, ., - y ,
	return sqlDeReemplazo;
}
SqlListaDeNumeros= function () { return { sqlParaVal: SqlListaDeNumerosSql, setVal: zerof }; };

dbExecSqlParaDriver= function(cx,dbs,paramsKvNorm) { //U: devuelve el sql que el driver entiende despues de aplicar nuestras mejoras, ej. generar lista de numeros para un where xxx in ...
	//U: recibe CX para poder averiguar el tipo de conexion (Oracle, Postgress, etc.) y generar el sql correspondiente
	var sqlParaDriver= dbs.sqlstd; //DFLT
	var dbsLog= clonar(dbs); delete(dbsLog.stmt); //A: sino se rompe el json
	for (var i=0; i<dbs.names.length; i++) { 
		var esteNombre= dbs.names[i];
		var esteTipo= dbs.types[esteNombre];
		if (esteTipo.handlerInfo.sqlParaVal) { //A: el sql cambia con los parametros
			var sqlDeReemplazo= esteTipo.handlerInfo.sqlParaVal(esteNombre,esteTipo,paramsKvNorm);
			sqlParaDriver= sqlParaDriver.replace(new RegExp("\\$"+esteNombre+":"+esteTipo.nombre,"gi"),sqlDeReemplazo);
		}
		logm("DBG",9,"dbExecSqlParaDriver",{dbs: dbsLog, idx: i, esteNombre: esteNombre, esteTipo: esteTipo});
	}
	logm("DBG",8,"dbExecSqlParaDriver FIN",{dbs: dbsLog, idx: i, esteNombre: esteNombre, esteTipo: esteTipo, sqlParaDriver: sqlParaDriver});
	return sqlParaDriver;
}


