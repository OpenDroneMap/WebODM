import React from 'react';
import { mount } from 'enzyme';
import ManageMediaDialog from '../ManageMediaDialog';

describe('<ManageMediaDialog />', () => {
    it('renders without exploding', () => {
      const wrapper = mount(<ManageMediaDialog
        task={{id: 1, project: 1, media: 0}}
        projectId={1}
        canEdit={true}
        onClose={() => {}}
      />);
      expect(wrapper.exists()).toBe(true);
    })
  });
