import React from 'react';
import { shallow } from 'enzyme';
import EditPresetDialog from '../EditPresetDialog';

const presetMock = require('../../tests/utils/MockLoader').load("preset.json");

describe('<EditPresetDialog />', () => {
  it('renders without exploding', () => {
    const wrapper = shallow(<EditPresetDialog 
             preset={presetMock}
             availableOptions={[]}
             saveAction={() => {}}
             deleteAction={() => {}}
        />);
    expect(wrapper.exists()).toBe(true);
  })
});