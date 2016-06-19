import React from 'react';
import BundleHOC from './BundleHOC';

class Embed extends React.Component {
    render() {
        return (
            <div>Boo</div>
        );
    }
}

export default BundleHOC(Embed);
