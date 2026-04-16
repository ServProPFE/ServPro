import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const ProviderListNavLink = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <Link
      to="/providers"
      className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
      onClick={onNavigate}
    >
      {t('nav.providerList')}
    </Link>
  );
};

ProviderListNavLink.propTypes = {
  onNavigate: PropTypes.func,
};

ProviderListNavLink.defaultProps = {
  onNavigate: undefined,
};

export default ProviderListNavLink;
