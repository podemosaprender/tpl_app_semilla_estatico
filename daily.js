function scr_daily(my) {
	my.render= function (props,state) {
		return h(Cmp.Container,{},
			cmp({cmp: 'Form', error: true, children: [
				{cmp: 'Form.Group', widths:'equal', children: [
					{cmp: 'Form.Input', fluid: true, label:'Github User', placeholder:'username' },
					{cmp: 'Form.Input', fluid: true, label:'Github Pass', placeholder:'pass' },
				]},
				{cmp: 'Form.Button', txt: 'Login'},
			]}
		));
	}
}
