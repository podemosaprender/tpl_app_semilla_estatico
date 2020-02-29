GhUser= null;
GhPass= null;
function onLogin() {
	console.log("Pidio login", GhUser, GhPass);
}

function onUser(e) {
	GhUser= e.target.value;
}

function onPass(e) {
	GhPass= e.target.value;
}

function scr_daily(my) {
	my.render= function (props,state) {
		return h(Cmp.Container,{},
			cmp({cmp: 'Form', error: true, children: [
				{cmp: 'Form.Group', widths:'equal', children: [
					{cmp: 'Form.Input', fluid: true, label:'Github User', placeholder:'username', onChange: e => onUser(e) },
					{cmp: 'Form.Input', type:'password',fluid: true, label:'Github Pass', placeholder:'pass', onChange: e => onPass(e) },
				]},
				{cmp: 'Form.Button', txt: 'Login', onClick: onLogin},
			]}
		));
	}
}
