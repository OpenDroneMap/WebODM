import React from 'react';
import { mount } from 'enzyme';
import MediaView from '../MediaView';

describe('<MediaView />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<MediaView basePath="/api/projects/1/tasks/1/media" media={{ filename: 'test.jpg', type: 'photo', description: '', size: 1024 }} />);
      expect(wrapper.exists()).toBe(true);
    });

    it('renders with pano without exploding', () => {
      const wrapper = mount(<MediaView basePath="/api/projects/1/tasks/1/media" media={{ filename: 'pano.jpg', type: 'pano', description: '', size: 2048 }} />);
      expect(wrapper.exists()).toBe(true);
    });

    it('renders with video without exploding', () => {
      const wrapper = mount(<MediaView basePath="/api/projects/1/tasks/1/media" media={{ filename: 'clip.mp4', type: 'video', description: '', size: 4096 }} />);
      expect(wrapper.exists()).toBe(true);
    });
  });
