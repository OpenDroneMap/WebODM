import React from 'react';
import { mount } from 'enzyme';
import LayersControlAnnotations from '../LayersControlAnnotations';

describe('<LayersControlAnnotations />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<LayersControlAnnotations layers={[]} />);
      expect(wrapper.exists()).toBe(true);
    })
});