GhUser= null;
GhPass= null;
GhOpts= null;

GhRepos= null;
function onLogin() {
	console.log("Pidio login", GhUser, "*****");
	GhOpts= {user: GhUser, pass: GhPass};
	return keys_file_github_p('',GhOpts)
		.then(res => { GhRepos= res} );
}

function onUser(e) {
	GhUser= e.target.value;
}

function onPass(e) {
	GhPass= e.target.value;
}

function scr_daily(my) {
	function uiOnLogin() {
		onLogin().then(x => my.refresh());
	}

	my.render= function (props,state) {
		return h(Cmp.Container,{},
			cmp({cmp: 'Form', error: true, children: [
				{cmp: 'Form.Group', widths:'equal', children: [
					{cmp: 'Form.Input', fluid: true, label:'Github User', placeholder:'username', onChange: e => onUser(e) },
					{cmp: 'Form.Input', type:'password',fluid: true, label:'Github Pass', placeholder:'pass', onChange: e => onPass(e) },
				]},
				{cmp: 'Form.Button', txt: 'Login', onClick: uiOnLogin},
			]}
		),
			 GhRepos==null ? 'Todavia no cargue los repos' : {cmp: 'ul', children: GhRepos.map( d => ({cmp:'li', children: [ d.name ]})) }
			);
	}
}
