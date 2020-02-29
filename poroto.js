function scr_hola(my) {
	my.render= function () {
		return h('h3',{},'Hola PodemosAprender');
	}
}

Routes["/"]= {cmp: "scr_hola"};
