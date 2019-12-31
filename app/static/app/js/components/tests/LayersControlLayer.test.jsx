import React from 'react';
import { mount } from 'enzyme';
import LayersControlLayer from '../LayersControlLayer';

describe('<LayersControlLayer />', () => {
    it('renders without exploding', () => {
      const map = {
          hasLayer: () => true
      };
      const wrapper = mount(<LayersControlLayer layer={{}} map={map} />);
      expect(wrapper.exists()).toBe(true);
    })
});