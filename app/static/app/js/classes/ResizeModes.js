import { _ } from './gettext';

const dict = [
  {k: 'NO', v: 0, human: _("No")}, // Don't resize
  {k: 'YES', v: 1, human: _("Yes")} // Resize on server
];

const exp = {
  all: () => dict.map(d => d.v),
  fromString: (s) => {
    let v = parseInt(s);
    if (!isNaN(v) && v >= 0 && v <= 1) return v;
    else return 0;
  },
  toHuman: (v) => {
    for (let i in dict){
      if (dict[i].v === v) return dict[i].human;
    }
    throw new Error("Invalid value: " + v);
  }
};
dict.forEach(en => {
  exp[en.k] = en.v;
});

export default exp;

