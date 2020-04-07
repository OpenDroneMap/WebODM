import LayersControl from '../LayersControl';

describe('<LayersControlButton />', () => {
  it('compiled without exploding', () => {
    expect(LayersControl.prototype.onAdd !== undefined).toBe(true);
  })
});