import sys


class NetworkSecurityException(Exception):
    """
    Custom exception that captures file name and line number
    so errors are traceable back to the exact component that failed.
    """

    def __init__(self, error_message: Exception, error_details: sys):
        self.error_message = str(error_message)
        _, _, exc_tb = error_details.exc_info()
        self.lineno = exc_tb.tb_lineno
        self.file_name = exc_tb.tb_frame.f_code.co_filename

    def __str__(self):
        return (
            f"Error occurred in python script [{self.file_name}] "
            f"line number [{self.lineno}] error message [{self.error_message}]"
        )


# Usage pattern inside any component:
# try:
#     ...
# except Exception as e:
#     raise NetworkSecurityException(e, sys)
