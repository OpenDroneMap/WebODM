import React from 'react';
import { mount } from 'enzyme';
import GCPPopup from '../GCPPopup';

describe('<GCPPopup />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<GCPPopup task={{id: 1, project: 1}} feature={{properties: {id: "test", error: [0,1,2], observations: [{shot_id: "test", annotated: [0, 0], reprojected: [0,0]}]}}} />);
      expect(wrapper.exists()).toBe(true);
    })
  });
