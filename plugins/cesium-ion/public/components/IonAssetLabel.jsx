import React, { PureComponent, Fragment } from "react";
import { AssetStyles } from "../defaults";

const IonAssetLabel = ({ asset, showIcon = false, ...options }) => (
	<Fragment>
		{showIcon && <i className={`${AssetStyles[asset].icon}`} />}
		{"  "}
		{AssetStyles[asset].name}
	</Fragment>
);

export default IonAssetLabel;
