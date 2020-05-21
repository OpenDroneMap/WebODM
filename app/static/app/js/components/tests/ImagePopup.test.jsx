import React from 'react';
import { mount } from 'enzyme';
import ImagePopup from '../ImagePopup';

describe('<ImagePopup />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<ImagePopup task={{id: 1, project: 1}} feature={{properties: {filename: "abc"}}} />);
      expect(wrapper.exists()).toBe(true);
    })
  });
