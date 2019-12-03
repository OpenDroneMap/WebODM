import React from 'react';
import { mount } from 'enzyme';
import LayersControlPanel from '../LayersControlPanel';

describe('<LayersControlPanel />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<LayersControlPanel onClose={() => {}} layers={[]} map={{}} />);
      expect(wrapper.exists()).toBe(true);
    })
});