import React from 'react';
import { mount } from 'enzyme';
import GCPPopup from '../GCPPopup';

describe('<GCPPopup />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<GCPPopup task={{id: 1, project: 1}} feature={{properties: {id: "test", observations: []}}} />);
      expect(wrapper.exists()).toBe(true);
    })
  });
