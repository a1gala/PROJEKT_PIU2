import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, loggedIn }) => {
    if (!loggedIn) {
        return <Navigate to="/" />;
    }
    return children;
};

export default ProtectedRoute;
